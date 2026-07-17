/**
 * Email Parser Utility
 *
 * Shared utility for extracting body text from Gmail MIME payloads.
 * Used by both the Gmail webhook controller and the manual sync controller.
 */

/**
 * Recursively walk MIME parts and extract the full body text.
 * Priority: text/plain → text/html → first part with data
 * Falls back to snippet if nothing is found.
 *
 * @param {object} payload - Gmail message payload object
 * @param {string} [snippet=""] - Fallback snippet text
 * @returns {string} Extracted body text
 */
function extractBody(payload, snippet = "") {
  if (!payload) return snippet;

  // Direct body (simple non-multipart message)
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf8");
  }

  if (!payload.parts || payload.parts.length === 0) return snippet;

  // Recursively collect all parts into a flat list
  function collectParts(parts) {
    const flat = [];
    for (const part of parts) {
      if (part.parts) {
        flat.push(...collectParts(part.parts));
      } else {
        flat.push(part);
      }
    }
    return flat;
  }

  const allParts = collectParts(payload.parts);

  // Prefer plain text
  const plainPart = allParts.find((p) => p.mimeType === "text/plain" && p.body?.data);
  if (plainPart) {
    return Buffer.from(plainPart.body.data, "base64url").toString("utf8");
  }

  // Fall back to HTML
  const htmlPart = allParts.find((p) => p.mimeType === "text/html" && p.body?.data);
  if (htmlPart) {
    return Buffer.from(htmlPart.body.data, "base64url").toString("utf8");
  }

  // Last resort: first part with any data
  const anyPart = allParts.find((p) => p.body?.data);
  if (anyPart) {
    return Buffer.from(anyPart.body.data, "base64url").toString("utf8");
  }

  return snippet;
}

module.exports = { extractBody };
