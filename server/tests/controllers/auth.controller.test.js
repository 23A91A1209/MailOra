/**
 * Tests for modules/auth/auth.controller.js — Authentication Controller
 *
 * Uses jest.resetModules pattern to ensure mocks are properly injected.
 */

jest.mock("../../utils/logger", () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));
jest.mock("../../services/otp.email.service", () => ({
  sendSignupOtpEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendChangePasswordEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock("../../services/s3.service", () => ({
  getPresignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/photo.jpg"),
}));

const bcrypt = require("bcryptjs");

function mk(body = {}) {
  return {
    req: { body, params: {}, query: {}, cookies: {}, headers: {}, user: { _id: "u1" } },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    },
    next: jest.fn(),
  };
}

describe("Auth Controller", () => {
  let controller, User, PV;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Mongoose models BEFORE requiring the controller
    jest.doMock("../../modules/user/user.model", () => ({
      findOne: jest.fn(),
      create: jest.fn(),
    }));
    jest.doMock("../../modules/auth/pendingVerification.model", () => ({
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    }));

    // Require fresh copies
    User = require("../../modules/user/user.model");
    PV = require("../../modules/auth/pendingVerification.model");
    controller = require("../../modules/auth/auth.controller");
  });

  afterEach(() => {
    jest.resetModules();
  });

  // ─── sendSignupOtp ────────────────────────────────────────────

  it("rejects duplicate email", async () => {
    User.findOne.mockResolvedValue({ email: "a@b.com" });
    const { req, res, next } = mk({ email: "a@b.com" });
    await controller.sendSignupOtp(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("sends OTP for new email", async () => {
    User.findOne.mockResolvedValue(null);
    PV.findOneAndUpdate.mockResolvedValue({});
    const { req, res, next } = mk({ email: "new@b.com" });
    await controller.sendSignupOtp(req, res, next);
    expect(PV.findOneAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ─── signup ───────────────────────────────────────────────────

  it("signup — 400 when no OTP record", async () => {
    PV.findOne.mockResolvedValue(null);
    const { req, res, next } = mk({ name: "T", email: "a@b.com", password: "X", otp: "123456" });
    await controller.signup(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signup — 400 when OTP expired", async () => {
    PV.findOne.mockResolvedValue({ hashedOtp: "h", expiresAt: new Date(Date.now() - 60000) });
    PV.deleteOne.mockResolvedValue({});
    const { req, res, next } = mk({ name: "T", email: "a@b.com", password: "X", otp: "123456" });
    await controller.signup(req, res, next);
    expect(PV.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signup — 400 when OTP incorrect", async () => {
    const wrongHash = await bcrypt.hash("999999", 10);
    PV.findOne.mockResolvedValue({ hashedOtp: wrongHash, expiresAt: new Date(Date.now() + 300000) });
    const { req, res, next } = mk({ name: "T", email: "a@b.com", password: "X", otp: "123456" });
    await controller.signup(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("signup — 201 with valid OTP", async () => {
    const goodHash = await bcrypt.hash("123456", 10);
    PV.findOne.mockResolvedValue({ hashedOtp: goodHash, expiresAt: new Date(Date.now() + 300000) });
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "u1", name: "T", email: "t@t.com" });
    PV.deleteOne.mockResolvedValue({});
    const { req, res, next } = mk({ name: "T", email: "t@t.com", password: "Abc@1234", otp: "123456" });
    await controller.signup(req, res, next);
    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // ─── login ────────────────────────────────────────────────────

  it("login — 400 when no creds", async () => {
    const { req, res, next } = mk({});
    await controller.login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("login — 400 when user not found", async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const { req, res, next } = mk({ email: "x@x.com", password: "p" });
    await controller.login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("login — 200 on valid credentials", async () => {
    const h = await bcrypt.hash("Pass@1", 10);
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "u1", name: "T", email: "t@t.com", password: h,
        authProvider: "local", photoS3Key: null, photoUrl: null,
      }),
    });
    const { req, res, next } = mk({ email: "t@t.com", password: "Pass@1" });
    await controller.login(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ─── logout ───────────────────────────────────────────────────

  it("logout — clears cookie", () => {
    const { req, res } = mk();
    controller.logout(req, res);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ─── forgotPassword ───────────────────────────────────────────

  it("forgotPassword — 400 if no email", async () => {
    const { req, res, next } = mk({ email: "" });
    await controller.forgotPassword(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("forgotPassword — no email enumeration", async () => {
    User.findOne.mockResolvedValue(null);
    const { req, res, next } = mk({ email: "no@no.com" });
    await controller.forgotPassword(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
