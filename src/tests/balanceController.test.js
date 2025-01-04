// tests/balanceController.test.js
const { depositBalance } = require("../controllers/balanceController");
const { Profile, Job, Contract, sequelize } = require("../models/model");
const { depositSchema } = require("../utils/validation");
const Joi = require("joi");

jest.mock("../models/model"); // Mock models

describe("Balance Controller", () => {
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
      };
      sequelize.transaction = jest.fn().mockResolvedValue(transaction);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should deposit balance successfully when amount is within limit", async () => {
      const mockClient = {
        id: 1,
        type: "client",
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      Profile.findOne.mockResolvedValue(mockClient);
      Job.sum.mockResolvedValue(200); // Total jobs to pay

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith(req.body);
      expect(Profile.findOne).toHaveBeenCalledWith({
        where: { id: 1, type: "client" },
      });
      expect(Job.sum).toHaveBeenCalledWith("price", {
        where: { paid: false },
        include: {
          model: Contract,
          where: { ClientId: 1, status: "in_progress" },
        },
      });
      expect(mockClient.balance).toBe(150); // 100 + 50
      expect(mockClient.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Deposit successful",
        balance: 150,
      });
    });

    it("should return 400 if deposit amount exceeds 25% of total jobs to pay", async () => {
      req.body.amount = 100; // 25% of 200 is 50
      const mockClient = {
        id: 1,
        type: "client",
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      Profile.findOne.mockResolvedValue(mockClient);
      Job.sum.mockResolvedValue(200); // Total jobs to pay

      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Deposit amount exceeds 25% of total jobs to pay",
      });
    });

    it("should return 400 for invalid deposit amount", async () => {
      req.body.amount = -50;
      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '"amount" must be a positive number',
      });
    });

    it("should return 404 if client is not found", async () => {
      Profile.findOne.mockResolvedValue(null);

      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Client not found" });
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      Profile.findOne.mockRejectedValue(error);

      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });

  describe("Concurrent Deposits", () => {
    beforeAll(async () => {
      await sequelize.sync({ force: true });
      await Profile.bulkCreate([
        {
          id: 1,
          firstName: "Harry",
          lastName: "Potter",
          profession: "Wizard",
          balance: 1000,
          type: "client",
        },
      ]);
      await Contract.bulkCreate([
        {
          id: 1,
          terms: "Contract 1 terms",
          status: "in_progress",
          ClientId: 1,
          ContractorId: 2,
        },
      ]);
      await Job.bulkCreate([
        {
          id: 1,
          description: "Magic lessons",
          price: 200,
          paid: false,
          ContractId: 1,
        },
        {
          id: 2,
          description: "Advanced spells",
          price: 300,
          paid: false,
          ContractId: 1,
        },
      ]);
    });

    // afterAll(async () => {
    //   await sequelize.close();
    // });

    it("should prevent deposits exceeding the 25% limit even with concurrent requests", async () => {
      // Total unpaid jobs = 200 + 300 = 500
      // 25% of 500 = 125

      // Simulate two concurrent deposit requests
      const depositRequest = (amount) =>
        request(app)
          .post("/balances/deposit/1")
          .set("profile_id", 1)
          .send({ amount });

      const [response1, response2] = await Promise.all([
        depositRequest(100), // Exceeds limit
        depositRequest(25), // Within limit
      ]);

      // One should succeed, the other should fail
      const successResponses = [response1, response2].filter(
        (res) => res.status === 200
      );
      const failureResponses = [response1, response2].filter(
        (res) => res.status !== 200
      );

      expect(successResponses.length).toBe(1);
      expect(failureResponses.length).toBe(1);
      expect(failureResponses[0].body).toHaveProperty(
        "error",
        "Deposit amount exceeds 25% of total jobs to pay"
      );

      // Verify balance
      const client = await Profile.findByPk(1);
      expect(client.balance).toBe("1025.00"); // 1000 + 25
    });
  });
});
