/**
 * Email AI Classification Service
 *
 * Classifies emails using Google Gemini AI with a circuit breaker
 * to prevent cascading failures when the API is unavailable.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const CircuitBreaker = require("../utils/circuitBreaker");
const logger = require("../utils/logger");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Circuit breaker: opens after 5 failures, retries after 30s
const geminiBreaker = new CircuitBreaker({
  name: "GeminiAI",
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 2,
});

exports.classifyEmail = async (subject, body) => {
  return geminiBreaker.call(async () => {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const prompt = `
You are a specialized Email Classifier for a job and opportunity tracker. Your task is to extract structured data from emails into a specific JSON schema.

### Classification Rules:
- CATEGORY: "job", "internship", "hackathon", "workshop", or "other".
- STAGE:
    - "registration": Has a CTA to apply/register (e.g., "Apply Now", "Register here").
    - "registered": Confirmation of receipt (e.g., "Application received", "Successfully registered").
    - "inprogress": Interviews, coding rounds, or technical assessments.
    - "confirmed": Offer letters, acceptance, or onboarding.
    - "other": General news or non-specific updates.

### Deadline Extraction Rules:
- If a deadline is explicitly mentioned, return it in YYYY-MM-DD.
- If no deadline is found AND stage is "registration", "inprogress", or "other", return ${tomorrow}.
- For stages "registered" and "confirmed", ALWAYS return null.

### Content Extraction Rules:
- MATTER: Provide a very concise, neat summary (max 2-3 sentences) of the opportunities presented in the email. If there are multiple jobs/internships (e.g., newsletter), list their titles and companies briefly (e.g., "Opportunities include: Software Engineer at Oracle, AI Engineer at Zenotalent..."). Do NOT include large clunky text, raw URLs, or unnecessary details in the matter.
- LINKS: Extract all relevant application, registration, or opportunity links found in the email. Return them as a clean array of URL strings. Ignore image links or tracking pixels.

### Output Format:
Return ONLY a valid JSON object. Do not include markdown code blocks or conversational text.
{
  "category": "string",
  "stage": "string",
  "deadline": "YYYY-MM-DD or null",
  "matter": "string",
  "links": ["url1", "url2"]
}

Today's date: ${today}
Subject: ${subject}
Body: ${body}
    `;

    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  });
};

/** Expose circuit breaker state for health checks */
exports.getCircuitBreakerState = () => geminiBreaker.getState();
