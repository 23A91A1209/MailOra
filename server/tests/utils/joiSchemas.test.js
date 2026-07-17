/**
 * Tests for utils/joiSchemas.js — Joi validation schemas and middleware
 */
const { joiSchemas, validateBody } = require("../../utils/joiSchemas");

describe("Joi Schemas", () => {
  // ─── Auth Schemas ────────────────────────────────────────────

  describe("login schema", () => {
    it("should pass with valid email and password", () => {
      const { error } = joiSchemas.login.validate({
        email: "test@example.com",
        password: "123456",
      });
      expect(error).toBeUndefined();
    });

    it("should fail without email", () => {
      const { error } = joiSchemas.login.validate({ password: "123456" });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("email");
    });

    it("should fail with invalid email", () => {
      const { error } = joiSchemas.login.validate({
        email: "not-an-email",
        password: "123456",
      });
      expect(error).toBeDefined();
    });

    it("should fail with short password", () => {
      const { error } = joiSchemas.login.validate({
        email: "test@test.com",
        password: "12345",
      });
      expect(error).toBeDefined();
    });

    it("should lowercase email", () => {
      const { value } = joiSchemas.login.validate({
        email: "TEST@EXAMPLE.COM",
        password: "123456",
      });
      expect(value.email).toBe("test@example.com");
    });
  });

  describe("signup schema", () => {
    const validSignup = {
      name: "John Doe",
      email: "john@example.com",
      password: "securepass",
      otp: "123456",
    };

    it("should pass with all valid fields", () => {
      const { error } = joiSchemas.signup.validate(validSignup);
      expect(error).toBeUndefined();
    });

    it("should fail without name", () => {
      const { error } = joiSchemas.signup.validate({
        ...validSignup,
        name: undefined,
      });
      expect(error).toBeDefined();
    });

    it("should fail with non-6-digit OTP", () => {
      const { error } = joiSchemas.signup.validate({
        ...validSignup,
        otp: "12345",
      });
      expect(error).toBeDefined();
    });

    it("should fail with alphabetic OTP", () => {
      const { error } = joiSchemas.signup.validate({
        ...validSignup,
        otp: "abcdef",
      });
      expect(error).toBeDefined();
    });
  });

  describe("sendSignupOtp schema", () => {
    it("should pass with valid email", () => {
      const { error } = joiSchemas.sendSignupOtp.validate({
        email: "test@test.com",
      });
      expect(error).toBeUndefined();
    });

    it("should fail without email", () => {
      const { error } = joiSchemas.sendSignupOtp.validate({});
      expect(error).toBeDefined();
    });
  });

  // ─── User Schemas ────────────────────────────────────────────

  describe("updateBasicInfo schema", () => {
    it("should pass with partial fields", () => {
      const { error } = joiSchemas.updateBasicInfo.validate({ name: "Jane" });
      expect(error).toBeUndefined();
    });

    it("should pass with empty body (all optional)", () => {
      const { error } = joiSchemas.updateBasicInfo.validate({});
      expect(error).toBeUndefined();
    });

    it("should fail with invalid country code", () => {
      const { error } = joiSchemas.updateBasicInfo.validate({
        countryCode: "abc",
      });
      expect(error).toBeDefined();
    });

    it("should accept valid country code", () => {
      const { error } = joiSchemas.updateBasicInfo.validate({
        countryCode: "+91",
      });
      expect(error).toBeUndefined();
    });

    it("should fail with invalid mobile number", () => {
      const { error } = joiSchemas.updateBasicInfo.validate({
        mobileNumber: "abc",
      });
      expect(error).toBeDefined();
    });
  });

  describe("sendMobileOtp schema", () => {
    it("should pass with valid data", () => {
      const { error } = joiSchemas.sendMobileOtp.validate({
        countryCode: "+91",
        mobileNumber: "9876543210",
      });
      expect(error).toBeUndefined();
    });

    it("should fail without countryCode", () => {
      const { error } = joiSchemas.sendMobileOtp.validate({
        mobileNumber: "9876543210",
      });
      expect(error).toBeDefined();
    });
  });

  describe("changeProfilePassword schema", () => {
    it("should pass with matching passwords", () => {
      const { error } = joiSchemas.changeProfilePassword.validate({
        current: "oldpass1",
        new: "newpass1",
        confirm: "newpass1",
      });
      expect(error).toBeUndefined();
    });

    it("should fail with non-matching passwords", () => {
      const { error } = joiSchemas.changeProfilePassword.validate({
        current: "oldpass1",
        new: "newpass1",
        confirm: "different",
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain("match");
    });
  });
});

// ─── validateBody middleware ────────────────────────────────────
describe("validateBody middleware", () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it("should call next() on valid input", () => {
    const middleware = validateBody(joiSchemas.login);
    const req = { body: { email: "test@test.com", password: "123456" } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 400 on invalid input", () => {
    const middleware = validateBody(joiSchemas.login);
    const req = { body: { email: "invalid", password: "123456" } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "fail",
        message: expect.any(String),
      })
    );
  });

  it("should strip unknown fields", () => {
    const middleware = validateBody(joiSchemas.login);
    const req = {
      body: { email: "test@test.com", password: "123456", malicious: "drop table" },
    };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).not.toHaveProperty("malicious");
  });

  it("should sanitize/lowercase email", () => {
    const middleware = validateBody(joiSchemas.login);
    const req = { body: { email: "  TEST@TEST.COM  ", password: "123456" } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.body.email).toBe("test@test.com");
  });
});
