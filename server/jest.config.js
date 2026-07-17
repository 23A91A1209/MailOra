/**
 * Jest Configuration for Mailora Server
 *
 * Includes test coverage reporting with minimum thresholds
 * to ensure adequate code coverage across the codebase.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  // Set a reasonable timeout for async operations
  testTimeout: 10000,
  // Setup environment variables for tests
  setupFiles: ["./tests/setup.js"],

  // ─── Coverage Configuration ─────────────────────────────────────────────
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "clover"],
  collectCoverageFrom: [
    "utils/**/*.js",
    "middlewares/**/*.js",
    "services/**/*.js",
    "modules/**/*.js",
    "config/**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
