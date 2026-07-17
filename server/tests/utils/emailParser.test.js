/**
 * Tests for utils/emailParser.js — MIME body extraction
 */
const { extractBody } = require("../../utils/emailParser");

describe("emailParser", () => {
  describe("extractBody()", () => {
    it("should extract body from a simple non-multipart message", () => {
      const payload = {
        body: {
          data: Buffer.from("Hello World").toString("base64url"),
        },
      };
      expect(extractBody(payload)).toBe("Hello World");
    });

    it("should return snippet when payload is null", () => {
      expect(extractBody(null, "fallback snippet")).toBe("fallback snippet");
    });

    it("should return snippet when payload has no body and no parts", () => {
      const payload = {};
      expect(extractBody(payload, "snippet text")).toBe("snippet text");
    });

    it("should prefer text/plain over text/html", () => {
      const payload = {
        parts: [
          {
            mimeType: "text/html",
            body: { data: Buffer.from("<b>HTML</b>").toString("base64url") },
          },
          {
            mimeType: "text/plain",
            body: { data: Buffer.from("Plain text").toString("base64url") },
          },
        ],
      };
      expect(extractBody(payload)).toBe("Plain text");
    });

    it("should fall back to text/html when no text/plain exists", () => {
      const payload = {
        parts: [
          {
            mimeType: "text/html",
            body: { data: Buffer.from("<p>HTML only</p>").toString("base64url") },
          },
        ],
      };
      expect(extractBody(payload)).toBe("<p>HTML only</p>");
    });

    it("should handle nested multipart structures", () => {
      const payload = {
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [
              {
                mimeType: "text/plain",
                body: { data: Buffer.from("Nested plain").toString("base64url") },
              },
              {
                mimeType: "text/html",
                body: { data: Buffer.from("<b>Nested HTML</b>").toString("base64url") },
              },
            ],
          },
        ],
      };
      expect(extractBody(payload)).toBe("Nested plain");
    });

    it("should return snippet when parts array is empty", () => {
      const payload = { parts: [] };
      expect(extractBody(payload, "empty parts snippet")).toBe("empty parts snippet");
    });

    it("should fall back to any part with data", () => {
      const payload = {
        parts: [
          {
            mimeType: "application/octet-stream",
            body: { data: Buffer.from("binary-ish").toString("base64url") },
          },
        ],
      };
      expect(extractBody(payload)).toBe("binary-ish");
    });
  });
});
