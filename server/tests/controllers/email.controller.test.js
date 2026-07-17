/**
 * Tests for modules/email/email.controller.js — Email Controller
 *
 * Tests email CRUD operations including cross-collection aggregation,
 * stage-specific queries, pagination, decryption, and deletion.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("../../modules/email/registration.model");
jest.mock("../../modules/email/registered.model");
jest.mock("../../modules/email/inprogress.model");
jest.mock("../../modules/email/confirmed.model");
jest.mock("../../modules/reminder/reminder.model");
jest.mock("../../utils/crypto", () => ({
  encrypt: jest.fn((text) => `encrypted:${text}`),
  decrypt: jest.fn((text) => text?.replace("encrypted:", "") || ""),
  generateOtp: jest.fn(() => "123456"),
}));
jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const RegistrationEmail = require("../../modules/email/registration.model");
const RegisteredEmail = require("../../modules/email/registered.model");
const InProgressEmail = require("../../modules/email/inprogress.model");
const ConfirmedEmail = require("../../modules/email/confirmed.model");
const Reminder = require("../../modules/reminder/reminder.model");
const controller = require("../../modules/email/email.controller");

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockReqRes(query = {}, params = {}) {
  const req = {
    query,
    params,
    user: { _id: "user123" },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

function createMockEmail(overrides = {}) {
  return {
    _doc: {
      _id: "email123",
      userId: "user123",
      subject: "encrypted:Test Subject",
      from: "encrypted:sender@test.com",
      snippet: "encrypted:Test snippet",
      body: "encrypted:Test body",
      matter: "encrypted:Test matter",
      links: ["encrypted:https://example.com"],
      category: "job",
      receivedAt: new Date(),
      ...overrides,
    },
    subject: "encrypted:Test Subject",
    from: "encrypted:sender@test.com",
    snippet: "encrypted:Test snippet",
    body: "encrypted:Test body",
    matter: "encrypted:Test matter",
    links: ["encrypted:https://example.com"],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Email Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getRegistrationEmails ──────────────────────────────────
  describe("getRegistrationEmails", () => {
    it("should return paginated registration emails", async () => {
      const mockEmails = [createMockEmail()];

      RegistrationEmail.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockEmails),
          }),
        }),
      });
      RegistrationEmail.countDocuments = jest.fn().mockResolvedValue(1);

      const { req, res, next } = mockReqRes({ page: "1", limit: "20" });
      await controller.getRegistrationEmails(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          pagination: expect.objectContaining({ total: 1 }),
        })
      );
    });

    it("should decrypt email fields", async () => {
      const mockEmails = [createMockEmail()];

      RegistrationEmail.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockEmails),
          }),
        }),
      });
      RegistrationEmail.countDocuments = jest.fn().mockResolvedValue(1);

      const { req, res, next } = mockReqRes();
      await controller.getRegistrationEmails(req, res, next);

      const emails = res.json.mock.calls[0][0].data;
      expect(emails[0].subject).toBe("Test Subject");
      expect(emails[0].from).toBe("sender@test.com");
    });

    it("should handle empty results", async () => {
      RegistrationEmail.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      RegistrationEmail.countDocuments = jest.fn().mockResolvedValue(0);

      const { req, res, next } = mockReqRes();
      await controller.getRegistrationEmails(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: expect.objectContaining({ total: 0 }),
        })
      );
    });
  });

  // ─── deleteEmail ────────────────────────────────────────────
  describe("deleteEmail", () => {
    it("should return 400 for invalid email type", async () => {
      const { req, res, next } = mockReqRes({}, { type: "invalid", id: "123" });

      await controller.deleteEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Invalid") })
      );
    });

    it("should return 404 if email not found", async () => {
      RegistrationEmail.findOne = jest.fn().mockResolvedValue(null);

      const { req, res, next } = mockReqRes({}, { type: "registration", id: "123" });
      await controller.deleteEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should delete email and associated reminders", async () => {
      RegistrationEmail.findOne = jest.fn().mockResolvedValue({ _id: "email123" });
      RegistrationEmail.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      Reminder.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });

      const { req, res, next } = mockReqRes({}, { type: "registration", id: "email123" });
      await controller.deleteEmail(req, res, next);

      expect(RegistrationEmail.deleteOne).toHaveBeenCalledWith({ _id: "email123" });
      expect(Reminder.deleteMany).toHaveBeenCalledWith({ emailId: "email123", status: "pending" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Pagination ─────────────────────────────────────────────
  describe("Pagination", () => {
    it("should respect page and limit params", async () => {
      RegistrationEmail.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      RegistrationEmail.countDocuments = jest.fn().mockResolvedValue(50);

      const { req, res, next } = mockReqRes({ page: "3", limit: "10" });
      await controller.getRegistrationEmails(req, res, next);

      // Verify skip was called with (page-1)*limit = 20
      const skipCall = RegistrationEmail.find().sort().skip;
      expect(skipCall).toHaveBeenCalledWith(20);
    });

    it("should enforce max limit of 100", async () => {
      RegistrationEmail.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      RegistrationEmail.countDocuments = jest.fn().mockResolvedValue(0);

      const { req, res, next } = mockReqRes({ page: "1", limit: "500" });
      await controller.getRegistrationEmails(req, res, next);

      const limitCall = RegistrationEmail.find().sort().skip().limit;
      expect(limitCall).toHaveBeenCalledWith(100);
    });
  });
});
