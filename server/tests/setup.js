/**
 * Test Setup — Environment variables for test runs.
 * Loaded before every test file via jest.config.js setupFiles.
 */
process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests";
process.env.EMAIL_ENCRYPTION_KEY = "test-encryption-key-for-unit-tests";
process.env.NODE_ENV = "test";
