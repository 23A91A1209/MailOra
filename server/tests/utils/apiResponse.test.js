/**
 * Tests for utils/apiResponse.js — Standardized response helpers
 */
const { sendSuccess, sendPaginated, sendError } = require("../../utils/apiResponse");

describe("apiResponse", () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // ─── sendSuccess ──────────────────────────────────────────────
  describe("sendSuccess()", () => {
    it("should return status 'success' with correct status code", () => {
      const res = mockRes();
      sendSuccess(res, 200, "It worked");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "It worked",
      });
    });

    it("should include data when provided", () => {
      const res = mockRes();
      sendSuccess(res, 201, "Created", { id: "123" });
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Created",
        data: { id: "123" },
      });
    });

    it("should omit data when undefined", () => {
      const res = mockRes();
      sendSuccess(res, 200, "No data");
      const response = res.json.mock.calls[0][0];
      expect(response).not.toHaveProperty("data");
    });
  });

  // ─── sendPaginated ────────────────────────────────────────────
  describe("sendPaginated()", () => {
    it("should return paginated response with metadata", () => {
      const res = mockRes();
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 2, totalPages: 1 };

      sendPaginated(res, data, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Results fetched",
        data,
        pagination,
      });
    });

    it("should accept custom message", () => {
      const res = mockRes();
      sendPaginated(res, [], { page: 1 }, "Custom message");
      expect(res.json.mock.calls[0][0].message).toBe("Custom message");
    });
  });

  // ─── sendError ────────────────────────────────────────────────
  describe("sendError()", () => {
    it("should return status 'fail' for 4xx codes", () => {
      const res = mockRes();
      sendError(res, 400, "Bad request");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].status).toBe("fail");
    });

    it("should return status 'error' for 5xx codes", () => {
      const res = mockRes();
      sendError(res, 500, "Server error");
      expect(res.json.mock.calls[0][0].status).toBe("error");
    });

    it("should include errors array when provided", () => {
      const res = mockRes();
      sendError(res, 400, "Validation failed", ["field1 is required"]);
      expect(res.json.mock.calls[0][0].errors).toEqual(["field1 is required"]);
    });

    it("should omit errors when not provided", () => {
      const res = mockRes();
      sendError(res, 404, "Not found");
      expect(res.json.mock.calls[0][0]).not.toHaveProperty("errors");
    });
  });
});
