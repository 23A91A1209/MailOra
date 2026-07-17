/**
 * Tests for services/watchRenewal.service.js — Gmail Watch Renewal
 *
 * Tests the automated Gmail Pub/Sub watch renewal scheduler including
 * account selection, API call, and error handling.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

jest.mock("../../modules/connectedAccount/connectedAccount.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../services/google.service", () => ({
  refreshGoogleTokenIfNeeded: jest.fn(),
  getGmailClient: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const ConnectedAccount = require("../../modules/connectedAccount/connectedAccount.model");
const { refreshGoogleTokenIfNeeded, getGmailClient } = require("../../services/google.service");
const { processWatchRenewals, renewWatch } = require("../../services/watchRenewal.service");

describe("Gmail Watch Renewal Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("renewWatch", () => {
    it("should renew watch and update account", async () => {
      const mockAccount = {
        emailAddress: "test@gmail.com",
        save: jest.fn().mockResolvedValue({}),
      };

      const mockGmail = {
        users: {
          watch: jest.fn().mockResolvedValue({
            data: {
              historyId: "12345",
              expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          }),
        },
      };

      refreshGoogleTokenIfNeeded.mockResolvedValue({});
      getGmailClient.mockReturnValue(mockGmail);

      const result = await renewWatch(mockAccount);

      expect(result).toBe(true);
      expect(mockAccount.lastHistoryId).toBe("12345");
      expect(mockAccount.save).toHaveBeenCalled();
    });

    it("should return false on failure", async () => {
      const mockAccount = {
        emailAddress: "test@gmail.com",
        save: jest.fn(),
      };

      refreshGoogleTokenIfNeeded.mockRejectedValue(new Error("Token expired"));

      const result = await renewWatch(mockAccount);

      expect(result).toBe(false);
    });
  });

  describe("processWatchRenewals", () => {
    it("should skip when no accounts need renewal", async () => {
      ConnectedAccount.find.mockResolvedValue([]);

      await processWatchRenewals();

      // Should not throw and should log debug message
      expect(ConnectedAccount.find).toHaveBeenCalled();
    });

    it("should process accounts needing renewal", async () => {
      const mockAccount = {
        emailAddress: "test@gmail.com",
        save: jest.fn().mockResolvedValue({}),
      };

      ConnectedAccount.find.mockResolvedValue([mockAccount]);

      const mockGmail = {
        users: {
          watch: jest.fn().mockResolvedValue({
            data: {
              historyId: "999",
              expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          }),
        },
      };

      refreshGoogleTokenIfNeeded.mockResolvedValue({});
      getGmailClient.mockReturnValue(mockGmail);

      await processWatchRenewals();

      expect(mockAccount.save).toHaveBeenCalled();
    });
  });
});
