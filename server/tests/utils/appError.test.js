/**
 * Tests for utils/AppError.js — Structured error class
 */
const AppError = require("../../utils/AppError");

describe("AppError", () => {
  it("should create an error with statusCode and message", () => {
    const err = new AppError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.status).toBe("fail");
    expect(err.isOperational).toBe(true);
  });

  it("should set status to 'fail' for 4xx errors", () => {
    expect(new AppError("Bad request", 400).status).toBe("fail");
    expect(new AppError("Unauthorized", 401).status).toBe("fail");
    expect(new AppError("Forbidden", 403).status).toBe("fail");
    expect(new AppError("Not found", 404).status).toBe("fail");
  });

  it("should set status to 'error' for 5xx errors", () => {
    expect(new AppError("Server error", 500).status).toBe("error");
    expect(new AppError("Bad gateway", 502).status).toBe("error");
  });

  it("should be an instance of Error", () => {
    const err = new AppError("test", 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("should have a stack trace", () => {
    const err = new AppError("test", 400);
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe("string");
    expect(err.stack.length).toBeGreaterThan(0);
  });
});

/**
 * Tests for utils/logger.js — Structured logging utility
 */
const logger = require("../../utils/logger");

describe("logger", () => {
  it("should have info, warn, error, and debug methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should not throw when called with various argument types", () => {
    expect(() => logger.info("Test", "message")).not.toThrow();
    expect(() => logger.error("Test", "error", new Error("test"))).not.toThrow();
    expect(() => logger.warn("Test", "warning", { key: "value" })).not.toThrow();
    expect(() => logger.debug("Test", "debug")).not.toThrow();
  });

  it("should handle Error objects in meta parameter", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    logger.error("Test", "Something failed", new Error("boom"));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
