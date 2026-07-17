/**
 * Tests for utils/auth.js — JWT and cookie helpers
 */
const jwt = require("jsonwebtoken");
const { generateToken, setAuthCookie } = require("../../utils/auth");

describe("auth utility", () => {
  // ─── generateToken ─────────────────────────────────────────────
  describe("generateToken()", () => {
    it("should return a valid JWT string", () => {
      const token = generateToken("user123");
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should encode the user ID in the payload", () => {
      const token = generateToken("abc123");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe("abc123");
    });

    it("should set a 7-day expiry", () => {
      const token = generateToken("user1");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  // ─── setAuthCookie ─────────────────────────────────────────────
  describe("setAuthCookie()", () => {
    it("should call res.cookie with correct parameters", () => {
      const mockRes = {
        cookie: jest.fn(),
      };

      setAuthCookie(mockRes, "test-token-value");

      expect(mockRes.cookie).toHaveBeenCalledWith(
        "token",
        "test-token-value",
        expect.objectContaining({
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
      );
    });

    it("should set sameSite=strict in non-production", () => {
      const mockRes = { cookie: jest.fn() };
      setAuthCookie(mockRes, "token");

      const cookieOptions = mockRes.cookie.mock.calls[0][2];
      expect(cookieOptions.sameSite).toBe("strict");
      expect(cookieOptions.secure).toBe(false);
    });
  });
});
