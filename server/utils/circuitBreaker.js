/**
 * Circuit Breaker — Prevents cascading failures when external services are down.
 *
 * Wraps async functions with a circuit breaker pattern:
 *   - CLOSED: Requests pass through normally.
 *   - OPEN: Requests fail immediately (no outbound call) for a cooldown period.
 *   - HALF-OPEN: One test request is allowed; if it succeeds, circuit closes.
 *
 * Usage:
 *   const CircuitBreaker = require("../utils/circuitBreaker");
 *   const geminiBreaker = new CircuitBreaker({ name: "Gemini", failureThreshold: 3 });
 *   const result = await geminiBreaker.call(() => classifyEmail(subject, body));
 */

const logger = require("./logger");

const STATES = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

class CircuitBreaker {
  /**
   * @param {object} options
   * @param {string}  options.name              - Name for logging (e.g., "Gemini")
   * @param {number}  [options.failureThreshold=5] - Failures before opening
   * @param {number}  [options.resetTimeoutMs=30000] - Ms to wait before half-open
   * @param {number}  [options.successThreshold=2]  - Successes in half-open to close
   */
  constructor({
    name,
    failureThreshold = 5,
    resetTimeoutMs = 30000,
    successThreshold = 2,
  }) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.successThreshold = successThreshold;

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} Result of fn()
   * @throws {Error} If circuit is open or fn fails
   */
  async call(fn) {
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker [${this.name}] is OPEN — request blocked. ` +
          `Retry after ${new Date(this.nextAttempt).toISOString()}`
        );
      }
      // Transition to half-open
      this.state = STATES.HALF_OPEN;
      this.successCount = 0;
      logger.info("CircuitBreaker", `[${this.name}] Transitioning to HALF_OPEN`);
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        logger.info("CircuitBreaker", `[${this.name}] Circuit CLOSED — service recovered`);
      }
    } else {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  _onFailure() {
    this.failureCount++;

    if (this.state === STATES.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      logger.warn(
        "CircuitBreaker",
        `[${this.name}] Circuit OPEN — ${this.failureCount} failures. ` +
        `Next attempt at ${new Date(this.nextAttempt).toISOString()}`
      );
    }
  }

  /** Get current circuit state for health checks */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === STATES.OPEN ? new Date(this.nextAttempt).toISOString() : null,
    };
  }
}

module.exports = CircuitBreaker;
