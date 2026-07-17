/**
 * Tests for utils/circuitBreaker.js — Circuit Breaker pattern
 */
const CircuitBreaker = require("../../utils/circuitBreaker");

// Suppress logger output during tests
jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe("CircuitBreaker", () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: "TestService",
      failureThreshold: 3,
      resetTimeoutMs: 100, // Short timeout for tests
      successThreshold: 2,
    });
  });

  // ─── Closed State ────────────────────────────────────────────
  it("should start in CLOSED state", () => {
    expect(breaker.getState().state).toBe("CLOSED");
  });

  it("should allow calls through in CLOSED state", async () => {
    const result = await breaker.call(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("should reset failure count on success in CLOSED state", async () => {
    // Cause some failures (not enough to open)
    await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();

    // Success should reset
    await breaker.call(() => Promise.resolve("ok"));
    expect(breaker.failureCount).toBe(0);
  });

  // ─── Open State ──────────────────────────────────────────────
  it("should open after threshold failures", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    }
    expect(breaker.getState().state).toBe("OPEN");
  });

  it("should reject calls immediately when OPEN", async () => {
    // Trigger open
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    }

    // Should fail immediately without calling fn
    const fn = jest.fn();
    await expect(breaker.call(fn)).rejects.toThrow("Circuit breaker");
    expect(fn).not.toHaveBeenCalled();
  });

  // ─── Half-Open State ─────────────────────────────────────────
  it("should transition to HALF_OPEN after timeout", async () => {
    // Trigger open
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    }

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 150));

    // Should now be allowed through (half-open)
    const result = await breaker.call(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
  });

  it("should close after enough successes in HALF_OPEN", async () => {
    // Trigger open
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    }

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 150));

    // Two successes to close (successThreshold = 2)
    await breaker.call(() => Promise.resolve("ok"));
    await breaker.call(() => Promise.resolve("ok"));

    expect(breaker.getState().state).toBe("CLOSED");
  });

  it("should re-open on failure in HALF_OPEN state", async () => {
    // Trigger open
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    }

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 150));

    // Fail again in half-open
    await expect(breaker.call(() => Promise.reject(new Error("still broken")))).rejects.toThrow();
    expect(breaker.getState().state).toBe("OPEN");
  });

  // ─── getState ────────────────────────────────────────────────
  it("should return correct state info", () => {
    const state = breaker.getState();
    expect(state.name).toBe("TestService");
    expect(state.state).toBe("CLOSED");
    expect(state.failureCount).toBe(0);
    expect(state.nextAttempt).toBeNull();
  });
});
