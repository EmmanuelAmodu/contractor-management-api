const { depositBalance } = require("../controllers/balanceController");
const { Profile, Job, Contract, sequelize } = require("../models/model");
const { depositSchema } = require("../utils/validation");
const logger = require("../utils/logger");

jest.mock("../models/model"); // Mock Sequelize models
jest.mock("../utils/validation", () => ({
  depositSchema: {
    validate: jest.fn(),
  },
}));
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe("Balance Controller Unit Tests", () => {
  describe("depositBalance", () => {
    let req;
    let res;
    let transaction;

    beforeEach(() => {
      req = {
        params: { userId: 1 },
        body: { amount: 50 },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
        LOCK: {
          UPDATE: "UPDATE",
          SHARE: "SHARE",
        },
      };
      sequelize.transaction = jest.fn().mockResolvedValue(transaction);
      depositSchema.validate.mockClear();
      Profile.findOne.mockClear();
      Job.sum.mockClear();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should deposit balance successfully when amount is within limit", async () => {
      // Mock validation to pass
      depositSchema.validate.mockReturnValue({ error: null });

      const mockClient = {
        id: 1,
        type: "client",
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      Profile.findOne.mockResolvedValue(mockClient);
      Job.sum.mockResolvedValue(200); // Total jobs to pay

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith({ amount: 50 });
      expect(Profile.findOne).toHaveBeenCalledWith({
        where: { id: 1, type: "client" },
        transaction: transaction,
        lock: "UPDATE",
      });
      expect(Job.sum).toHaveBeenCalledWith("price", {
        where: { paid: false },
        include: {
          model: Contract,
          where: { ClientId: 1, status: "in_progress" },
        },
        transaction: transaction,
        lock: "SHARE",
      });
      expect(mockClient.balance).toBe(150); // 100 + 50
      expect(mockClient.save).toHaveBeenCalledWith({
        transaction: transaction,
      });
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Deposit successful",
        balance: 150,
      });
    });

    it("should return 400 if deposit amount exceeds 25% of total jobs to pay", async () => {
      // Mock validation to pass
      depositSchema.validate.mockReturnValue({ error: null });

      req.body.amount = 130; // Exceeds 25% of 500 (which is 125)
      const mockClient = {
        id: 1,
        type: "client",
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      Profile.findOne.mockResolvedValue(mockClient);
      Job.sum.mockResolvedValue(500); // Total jobs to pay

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith({ amount: 130 });
      expect(Profile.findOne).toHaveBeenCalledWith({
        where: { id: 1, type: "client" },
        transaction: transaction,
        lock: "UPDATE",
      });
      expect(Job.sum).toHaveBeenCalledWith("price", {
        where: { paid: false },
        include: {
          model: Contract,
          where: { ClientId: 1, status: "in_progress" },
        },
        transaction: transaction,
        lock: "SHARE",
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Deposit amount exceeds 25% of total jobs to pay",
      });
      expect(transaction.rollback).toHaveBeenCalled();
      expect(transaction.commit).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid deposit amount", async () => {
      depositSchema.validate.mockReturnValue({
        error: { details: [{ message: '"amount" must be a positive number' }] },
      });
      req.body.amount = -50;

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith({ amount: -50 });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '"amount" must be a positive number',
      });
      expect(Profile.findOne).not.toHaveBeenCalled();
      expect(Job.sum).not.toHaveBeenCalled();
      expect(transaction.rollback).not.toHaveBeenCalled();
      expect(transaction.commit).not.toHaveBeenCalled();
    });

    it("should return 404 if client is not found", async () => {
      depositSchema.validate.mockReturnValue({ error: null });
      Profile.findOne.mockResolvedValue(null);

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith({ amount: 50 });
      expect(Profile.findOne).toHaveBeenCalledWith({
        where: { id: 1, type: "client" },
        transaction: transaction,
        lock: "UPDATE",
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Client not found" });
      expect(transaction.rollback).toHaveBeenCalled();
      expect(transaction.commit).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      depositSchema.validate.mockReturnValue({ error: null });
      const error = new Error("Database error");
      Profile.findOne.mockRejectedValue(error);

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith({ amount: 50 });
      expect(Profile.findOne).toHaveBeenCalledWith({
        where: { id: 1, type: "client" },
        transaction: transaction,
        lock: "UPDATE",
      });
      expect(transaction.rollback).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Deposit failed: Client ID 1. Error: ${error.message}`
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Deposit failed",
        details: "Database error",
      });
      expect(transaction.commit).not.toHaveBeenCalled();
    });
  });
});
