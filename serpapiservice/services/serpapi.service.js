/**
 * serpapi.service.js
 * ------------------
 * Wraps SerpAPI Google-Jobs calls.  For each role we fire TWO queries
 * (one fresher, one experienced) so the DB has both jobType buckets.
 */

const axios = require("axios");

const SERPAPI_BASE = "https://serpapi.com/search.json";
const API_KEY = process.env.SERPAPI_KEY;

/* ── Role → search-query mapping ────────────────────────────── */
const ROLE_QUERIES = {
  "Full Stack Developer": "Full Stack Developer IT jobs India",
  Cloud: "Cloud AWS GCP Azure IT jobs India",
  "AI Automation": "AI Automation Engineer IT jobs India",
  Flutter: "Flutter Developer IT jobs India",
  "Data Analytics": "Data Analytics IT jobs India",
  "Cyber Security": "Cyber Security IT jobs India",
  "Machine Learning": "Machine Learning Engineer IT jobs India",
};

/**
 * Classify a result as fresher or experienced based on title / snippet keywords.
 */
function classifyJobType(title = "", snippet = "") {
  const text = `${title} ${snippet}`.toLowerCase();
  const freshKeywords = [
    "fresher",
    "entry level",
    "entry-level",
    "junior",
    "intern",
    "0-1 year",
    "0-2 year",
    "graduate",
    "trainee",
  ];
  return freshKeywords.some((kw) => text.includes(kw)) ? "fresher" : "experienced";
}

/**
 * Fetch jobs for a single role from SerpAPI (Google Jobs engine).
 * Fetches up to 5 pages (10 results per page) to get a richer dataset.
 * Returns an array of normalised job documents ready for MongoDB insert.
 */
async function fetchJobsForRole(role) {
  const query = ROLE_QUERIES[role];
  if (!query) throw new Error(`Unknown role: ${role}`);

  const allJobs = [];

  // Fetch up to 2 pages per role
  for (let page = 0; page < 2; page++) {
    try {
      const { data } = await axios.get(SERPAPI_BASE, {
        params: {
          engine: "google_jobs",
          q: query,
          api_key: API_KEY,
          hl: "en",
          gl: "in",
          start: page * 10, // SerpAPI google_jobs pagination (0, 10, 20...)
        },
        timeout: 30_000,
      });

      const results = data.jobs_results || [];
      
      // If we run out of jobs before 5 pages, stop fetching early
      if (results.length === 0) break;

      const mapped = results.map((job) => ({
        title: job.title || "Untitled",
        company: job.company_name || "N/A",
        location: job.location || "Remote",
        salary:
          job.detected_extensions?.salary ||
          job.salary ||
          "Not disclosed",
        jobType: classifyJobType(job.title, job.description),
        role,
        postedAt: job.detected_extensions?.posted_at || "",
        applyLinks: (job.apply_options || []).map((o) => o.link).filter(Boolean),
        snippet: (job.description || "").slice(0, 300),
      }));

      allJobs.push(...mapped);
    } catch (err) {
      console.error(`[SerpAPI] Error fetching "${role}" page ${page + 1}:`, err.message);
      break; // Fallback: if one page fails, return whatever we collected so far
    }
  }

  return allJobs;
}

module.exports = { fetchJobsForRole, ROLE_QUERIES };
