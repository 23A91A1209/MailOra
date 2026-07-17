/**
 * Tests for middlewares/auth.middleware.js — JWT authentication middleware
 */

const jwt = require("jsonwebtoken");

// Mock User model
jest.mock("../../modules/user/user.model", () => ({
  findById: jest.fn(),
}));

const { protect } = require("../../middlewares/auth.middleware");
const User = require("../../modules/user/user.model");

describe("auth middleware — protect()", () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no token is provided", async () => {
    const req = { cookies: {}, headers: {} };
    const res = mockRes();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should extract token from cookies", async () => {
    const token = jwt.sign({ id: "user123" }, process.env.JWT_SECRET);
    const req = { cookies: { token }, headers: {} };
    const res = mockRes();

    User.findById.mockResolvedValue({ _id: "user123", name: "Test" });

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ _id: "user123", name: "Test" });
  });

  it("should extract token from Authorization header", async () => {
    const token = jwt.sign({ id: "user123" }, process.env.JWT_SECRET);
    const req = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
    };
    const res = mockRes();

    User.findById.mockResolvedValue({ _id: "user123", name: "Test" });

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it("should prefer cookie over Authorization header", async () => {
    const cookieToken = jwt.sign({ id: "cookieUser" }, process.env.JWT_SECRET);
    const headerToken = jwt.sign({ id: "headerUser" }, process.env.JWT_SECRET);
    const req = {
      cookies: { token: cookieToken },
      headers: { authorization: `Bearer ${headerToken}` },
    };
    const res = mockRes();

    User.findById.mockResolvedValue({ _id: "cookieUser", name: "Cookie" });

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("cookieUser");
  });

  it("should return 401 if token is invalid", async () => {
    const req = { cookies: { token: "invalid.token.here" }, headers: {} };
    const res = mockRes();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if user not found in DB", async () => {
    const token = jwt.sign({ id: "deleted-user" }, process.env.JWT_SECRET);
    const req = { cookies: { token }, headers: {} };
    const res = mockRes();

    User.findById.mockResolvedValue(null);

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });
});
