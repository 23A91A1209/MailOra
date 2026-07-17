/**
 * Tests for utils/validators.js — Input validation utilities
 */
const {
  validateEmail,
  validatePassword,
  validateOtp,
  validateRequiredFields,
  validate,
  schemas,
} = require("../../utils/validators");

describe("validators", () => {
  // ─── validateEmail ────────────────────────────────────────────
  describe("validateEmail()", () => {
    it("should accept valid email addresses", () => {
      expect(validateEmail("user@example.com").valid).toBe(true);
      expect(validateEmail("name.last@domain.co.in").valid).toBe(true);
      expect(validateEmail("test+tag@gmail.com").valid).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(validateEmail("not-an-email").valid).toBe(false);
      expect(validateEmail("@missing-local.com").valid).toBe(false);
      expect(validateEmail("missing@.com").valid).toBe(false);
      expect(validateEmail("spaces in@email.com").valid).toBe(false);
    });

    it("should reject null and undefined", () => {
      expect(validateEmail(null).valid).toBe(false);
      expect(validateEmail(undefined).valid).toBe(false);
      expect(validateEmail("").valid).toBe(false);
    });

    it("should return a message on failure", () => {
      const result = validateEmail("bad");
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe("string");
    });
  });

  // ─── validatePassword ─────────────────────────────────────────
  describe("validatePassword()", () => {
    it("should accept passwords >= 6 characters", () => {
      expect(validatePassword("123456").valid).toBe(true);
      expect(validatePassword("strongPassword!@#").valid).toBe(true);
    });

    it("should reject passwords < 6 characters", () => {
      expect(validatePassword("12345").valid).toBe(false);
      expect(validatePassword("ab").valid).toBe(false);
    });

    it("should reject null and empty", () => {
      expect(validatePassword(null).valid).toBe(false);
      expect(validatePassword("").valid).toBe(false);
    });

    it("should use custom field name in error message", () => {
      const result = validatePassword("ab", "New password");
      expect(result.message).toContain("New password");
    });
  });

  // ─── validateOtp ──────────────────────────────────────────────
  describe("validateOtp()", () => {
    it("should accept valid 6-digit OTPs", () => {
      expect(validateOtp("123456").valid).toBe(true);
      expect(validateOtp("000000").valid).toBe(true);
      expect(validateOtp("999999").valid).toBe(true);
    });

    it("should reject non-6-digit strings", () => {
      expect(validateOtp("12345").valid).toBe(false);
      expect(validateOtp("1234567").valid).toBe(false);
      expect(validateOtp("abcdef").valid).toBe(false);
      expect(validateOtp("12 345").valid).toBe(false);
    });

    it("should reject null and empty", () => {
      expect(validateOtp(null).valid).toBe(false);
      expect(validateOtp("").valid).toBe(false);
    });
  });

  // ─── validateRequiredFields ───────────────────────────────────
  describe("validateRequiredFields()", () => {
    it("should pass when all fields are present", () => {
      const body = { name: "John", email: "j@e.com", password: "123456" };
      expect(validateRequiredFields(body, ["name", "email", "password"]).valid).toBe(true);
    });

    it("should fail when a field is missing", () => {
      const body = { name: "John" };
      const result = validateRequiredFields(body, ["name", "email"]);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("email");
    });

    it("should fail when a field is empty string", () => {
      const body = { name: "", email: "j@e.com" };
      const result = validateRequiredFields(body, ["name", "email"]);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("name");
    });

    it("should fail when a field is null", () => {
      const body = { name: null };
      const result = validateRequiredFields(body, ["name"]);
      expect(result.valid).toBe(false);
    });
  });

  // ─── validate() middleware factory ────────────────────────────
  describe("validate() middleware", () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    it("should call next() when validation passes", () => {
      const middleware = validate(schemas.login);
      const req = { body: { email: "test@test.com", password: "123456" } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 400 when validation fails", () => {
      const middleware = validate(schemas.login);
      const req = { body: { email: "invalid", password: "123456" } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });
  });
});
