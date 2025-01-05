const { getUnpaidJobs, payJob } = require("../controllers/jobController");
const { Job, Contract, Profile, sequelize } = require("../models/model");

jest.mock("../models/model"); // Mock models

describe("Job Controller Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUnpaidJobs", () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        profile: { id: 1 },
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it("should return all unpaid jobs for active contracts", async () => {
      const mockJobs = [
        {
          id: 1,
          paid: false,
          Contract: { ClientId: 1, ContractorId: 2, status: "in_progress" },
        },
        {
          id: 2,
          paid: false,
          Contract: { ClientId: 3, ContractorId: 1, status: "in_progress" },
        },
      ];
      Job.findAll.mockResolvedValue(mockJobs);

      await getUnpaidJobs(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        where: { paid: false },
        include: {
          model: Contract,
          where: {
            [Contract.sequelize.Op.or]: [{ ClientId: 1 }, { ContractorId: 1 }],
            status: "in_progress",
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith(mockJobs);
    });

    it("should return an empty list if no unpaid jobs are found", async () => {
      Job.findAll.mockResolvedValue([]);

      await getUnpaidJobs(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Database error");
      Job.findAll.mockRejectedValue(error);

      await getUnpaidJobs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });

  describe("payJob", () => {
    let req;
    let res;
    let transaction;

    beforeEach(() => {
      req = {
        params: { job_id: 1 },
        profile: { id: 1 },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
        LOCK: {
          UPDATE: 'UPDATE', // Mock LOCK.UPDATE
        },
      };
      sequelize.transaction.mockResolvedValue(transaction);
    });

    it("should pay for a job successfully", async () => {
      const mockContractor = {
        id: 2,
        balance: 50,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJob = {
        id: 1,
        paid: false,
        price: 100,
        Contract: {
          ClientId: 1,
          Contractor: mockContractor,
        },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockClient = {
        id: 1,
        balance: 200,
        save: jest.fn().mockResolvedValue(true),
      };
      req.profile = mockClient;

      // Mock the necessary model methods
      Job.findOne.mockResolvedValue(mockJob);
      Contract.findOne.mockResolvedValue({
        Contractor: mockContractor,
      });
      Profile.findOne.mockResolvedValue(mockContractor);

      await payJob(req, res);

      expect(Job.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: {
            model: Contract,
            where: { ClientId: 1 },
            include: { model: Profile, as: "Contractor" },
          },
          transaction: transaction,
          lock: 'UPDATE',
        })
      );

      expect(mockClient.balance).toBe(100); // 200 - 100
      expect(mockContractor.balance).toBe(150); // 50 + 100
      expect(mockJob.paid).toBe(true);
      expect(mockJob.paymentDate).toBeInstanceOf(Date);
      expect(mockClient.save).toHaveBeenCalledWith({ transaction });
      expect(mockJob.save).toHaveBeenCalledWith({ transaction });
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment successful",
        job: mockJob,
      });
    });

    it("should return 404 if job is not found or access denied", async () => {
      Job.findOne.mockResolvedValue(null);

      await payJob(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Job not found or access denied",
      });
    });

    it("should return 400 if job is already paid", async () => {
      const mockJob = { paid: true };
      Job.findOne.mockResolvedValue(mockJob);

      await payJob(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Job is already paid" });
    });

    it("should return 400 if client has insufficient balance", async () => {
      const mockContractor = {
        id: 2,
        balance: 50,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJob = {
        id: 1,
        paid: false,
        price: 300,
        Contract: {
          ClientId: 1,
          Contractor: mockContractor,
        },
      };
      const mockClient = { id: 1, balance: 200 };
      req.profile = mockClient;

      Job.findOne.mockResolvedValue(mockJob);

      await payJob(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Insufficient balance" });
    });

    it("should handle transaction errors gracefully", async () => {
      const mockContractor = {
        id: 2,
        balance: 50,
        save: jest.fn().mockRejectedValue(new Error("Save error")),
      };
      const mockJob = {
        id: 1,
        paid: false,
        price: 100,
        Contract: {
          ClientId: 1,
          Contractor: mockContractor,
        },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockClient = {
        id: 1,
        balance: 200,
        save: jest.fn().mockResolvedValue(true),
      };
      req.profile = mockClient;

      Job.findOne.mockResolvedValue(mockJob);
      Contract.findOne.mockResolvedValue({
        Contractor: mockContractor,
      });
      Profile.findOne.mockResolvedValue(mockContractor);
      mockContractor.save.mockRejectedValue(new Error("Save error"));

      await payJob(req, res);

      expect(transaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Payment failed",
        details: "Save error",
      });
    });
  });

  describe("Concurrent Payments", () => {
    beforeAll(async () => {
      // Mock sequelize.sync and sequelize.close
      sequelize.sync.mockResolvedValue();
      sequelize.close.mockResolvedValue();

      // Mock Profile.bulkCreate, Contract.create, and Job.create
      Profile.bulkCreate.mockResolvedValue();
      Contract.create.mockResolvedValue();
      Job.create.mockResolvedValue();
    });

    afterAll(async () => {
      await sequelize.close();
    });

    it("should prevent double payments for the same job", async () => {
      // Define req and res for both requests
      const req1 = {
        params: { job_id: 1 },
        profile: { id: 1 },
      };
      const res1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const req2 = {
        params: { job_id: 1 },
        profile: { id: 1 },
      };
      const res2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock Job.findOne behavior
      const mockContractor = {
        id: 2,
        balance: 50,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJob = {
        id: 1,
        paid: false,
        price: 200,
        Contract: {
          ClientId: 1,
          Contractor: mockContractor,
        },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockClient = {
        id: 1,
        balance: 1000,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock the necessary model methods
      Job.findOne
        .mockResolvedValueOnce(mockJob) // First payment
        .mockResolvedValueOnce({ ...mockJob, paid: true }); // Second payment attempts to pay again
      Contract.findOne.mockResolvedValueOnce({
        Contractor: mockContractor,
      });
      Profile.findOne.mockResolvedValueOnce(mockContractor);
      Profile.findOne.mockResolvedValueOnce(mockContractor); // For second payment

      // Mock sequelize.transaction
      const transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
        LOCK: {
          UPDATE: 'UPDATE',
        },
      };
      sequelize.transaction.mockResolvedValue(transaction);

      // Execute both payment requests concurrently
      const payment1 = payJob(req1, res1);
      const payment2 = payJob(req2, res2);
      await Promise.all([payment1, payment2]);

      // One should succeed, the other should fail
      const successResponses = [res1, res2].filter(
        (res) => res.json.mock.calls.some(call => call[0].message === "Payment successful")
      );
      const failureResponses = [res1, res2].filter(
        (res) => res.json.mock.calls.some(call => call[0].error === "Job is already paid")
      );

      expect(successResponses.length).toBe(1);
      expect(failureResponses.length).toBe(1);
      expect(failureResponses[0].json).toHaveBeenCalledWith({
        error: "Job is already paid",
      });

      // Verify balances
      expect(mockClient.balance).toBe(800); // 1000 - 200
      expect(mockContractor.balance).toBe(250); // 50 + 200
      expect(mockJob.paid).toBe(true);
    });
  });
});
