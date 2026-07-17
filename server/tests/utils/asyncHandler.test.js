/**
 * Tests for utils/asyncHandler.js — Async route handler wrapper
 */
const asyncHandler = require("../../utils/asyncHandler");

describe("asyncHandler", () => {
  const mockReq = {};
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  it("should call the wrapped function with req, res, next", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const next = jest.fn();

    const handler = asyncHandler(fn);
    await handler(mockReq, mockRes, next);

    expect(fn).toHaveBeenCalledWith(mockReq, mockRes, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward errors to next() on rejection", async () => {
    const error = new Error("Something broke");
    const fn = jest.fn().mockRejectedValue(error);
    const next = jest.fn();

    const handler = asyncHandler(fn);
    await handler(mockReq, mockRes, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should forward thrown errors to next()", async () => {
    const error = new Error("Thrown error");
    const fn = jest.fn().mockImplementation(async () => { throw error; });
    const next = jest.fn();

    const handler = asyncHandler(fn);
    await handler(mockReq, mockRes, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should pass through synchronous return values", async () => {
    const fn = jest.fn().mockImplementation((req, res) => {
      res.json({ ok: true });
    });
    const next = jest.fn();

    const handler = asyncHandler(fn);
    await handler(mockReq, mockRes, next);

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
