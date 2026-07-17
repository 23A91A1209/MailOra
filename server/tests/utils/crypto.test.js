/**
 * Tests for utils/crypto.js — AES-256-CBC encryption utilities
 */
const { encrypt, decrypt } = require("../../utils/crypto");

describe("crypto utility", () => {
  describe("encrypt()", () => {
    it("should return an encrypted string with IV prefix", () => {
      const result = encrypt("Hello World");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toContain(":"); // IV:ciphertext format
    });

    it("should return different ciphertext for same input (random IV)", () => {
      const a = encrypt("same text");
      const b = encrypt("same text");
      expect(a).not.toBe(b); // Different IVs produce different output
    });

    it("should return null/undefined for null input", () => {
      expect(encrypt(null)).toBeNull();
    });

    it("should return undefined for undefined input", () => {
      expect(encrypt(undefined)).toBeUndefined();
    });

    it("should return empty string for empty string input", () => {
      expect(encrypt("")).toBe("");
    });
  });

  describe("decrypt()", () => {
    it("should correctly round-trip encrypt → decrypt", () => {
      const original = "Sensitive email subject line";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should handle special characters", () => {
      const original = "Re: 🎉 Your application — confirmed! <html> & \"quotes\"";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should handle long text (email body)", () => {
      const original = "x".repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should return original text if not encrypted (no colon)", () => {
      expect(decrypt("plain text without colon")).toBe("plain text without colon");
    });

    it("should handle null input gracefully", () => {
      expect(decrypt(null)).toBeNull();
    });

    it("should handle undefined input gracefully", () => {
      expect(decrypt(undefined)).toBeUndefined();
    });

    it("should return error message for invalid ciphertext", () => {
      const result = decrypt("invalid:ciphertext");
      expect(result).toBe("Error decrypting text");
    });
  });
});
