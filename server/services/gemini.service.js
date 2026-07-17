/**
 * Gemini AI Resume Extraction Service
 *
 * Uses Google Gemini AI SDK (@google/generative-ai) to extract structured
 * profile data from resume text (skills, experience, education, etc.).
 *
 * AI Library: @google/generative-ai (imported below)
 * AI Model:   gemini-2.5-flash
 * Invocation: model.generateContent(prompt) → JSON.parse(result.response.text())
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

// Initialize Google Generative AI SDK with API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.extractProfileData = async (resumeText) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
      Analyze the following resume text and extract all relevant profile data.
      Return a STRICT JSON object with exactly the following structure. If a section is empty or missing, return an empty array or empty string for that field. Do not include markdown code block syntax.

      {
        "role": "Detected Job Title or Role (e.g., Frontend Developer, Data Scientist)",
        "about": "A short summary or bio based on the resume (max 3 sentences)",
        "skills": ["Skill 1", "Skill 2", "..."],
        "achievements": "Any notable awards, honors, or major achievements as a single string paragraph",
        "experience": [
          { "role": "Job Title", "company": "Company Name", "duration": "e.g., Jan 2020 - Present", "description": "Brief description" }
        ],
        "education": [
          { "degree": "Degree Name", "institution": "University Name", "year": "e.g., 2018 - 2022" }
        ],
        "projects": [
          { "title": "Project Name", "description": "Brief description", "link": "" }
        ],
        "certifications": [
          { "name": "Certification Name", "issuer": "Issuing Organization", "year": "e.g., 2023" }
        ]
      }

      Resume Text:
      ${resumeText}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return JSON.parse(text);

    } catch (error) {
        logger.error("Gemini", "Full Error", error);
        throw error;
    }
};