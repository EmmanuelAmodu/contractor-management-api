// balanceController.integration.test.js
const request = require("supertest");
const app = require("../app");
const { sequelize, Job, Contract, Profile } = require("../models/model");

// Mock the getProfile middleware
jest.mock("../middleware/getProfile", () => {
  return {
    getProfile: (req, res, next) => {
      const profileId = req.headers.profile_id;
      if (!profileId) {
        return res.status(401).json({ error: "Missing profile_id header" });
      }
      // Check if profile exists
      if (profileId === "999") {
        // Simulate non-existent profile
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.profile = { id: Number(profileId), type: "client" };
      next();
    },
  };
});

describe("Balance Routes", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Reset database

    // Seed test data
    await Profile.bulkCreate([
      {
        id: 1,
        firstName: "Harry",
        lastName: "Potter",
        profession: "Wizard",
        balance: 1000,
        type: "client",
      },
      {
        id: 2,
        firstName: "Hermione",
        lastName: "Granger",
        profession: "Wizard",
        balance: 1500,
        type: "contractor",
      },
      {
        id: 3,
        firstName: "Ron",
        lastName: "Weasley",
        profession: "Wizard",
        balance: 500,
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
      {
        id: 2,
        terms: "Contract 2 terms",
        status: "in_progress",
        ClientId: 3,
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
      {
        id: 3,
        description: "Defense Against the Dark Arts",
        price: 150,
        paid: false,
        ContractId: 2,
      },
    ]);
  });

  afterAll(async () => {
    await sequelize.close(); // Close connection after tests
  });

  describe("depositBalance", () => {
    it("should deposit balance successfully when amount is within limit", async () => {
      const response = await request(app)
        .post("/balances/deposit/1")
        .set("profile_id", "1") // Valid profile
        .send({ amount: 50 })
        .expect(200);

      expect(response.body).toHaveProperty("message", "Deposit successful");
      expect(response.body).toHaveProperty("balance", 1050); // Expect number

      // Verify in the database
      const client = await Profile.findByPk(1);
      expect(client.balance).toBe(1050);
    });

    it("should return 400 if deposit amount exceeds 25% of total jobs to pay", async () => {
      // Total unpaid jobs: 200 + 300 + 150 = 650
      // 25% of 650 = 162.5
      const response = await request(app)
        .post("/balances/deposit/1")
        .set("profile_id", "1") // Valid profile
        .send({ amount: 200 }) // Exceeds 25%
        .expect(400);

      expect(response.body).toHaveProperty(
        "error",
        "Deposit amount exceeds 25% of total jobs to pay"
      );

      // Verify balance unchanged
      const client = await Profile.findByPk(1);
      expect(client.balance).toBe(1050); // From previous deposit
    });

    it("should return 400 for invalid deposit amount", async () => {
      const response = await request(app)
        .post("/balances/deposit/1")
        .set("profile_id", "1") // Valid profile
        .send({ amount: -50 })
        .expect(400);

      expect(response.body).toHaveProperty(
        "error",
        '"amount" must be a positive number'
      );

      // Verify balance unchanged
      const client = await Profile.findByPk(1);
      expect(client.balance).toBe(1050);
    });

    it("should return 404 if client is not found", async () => {
      const response = await request(app)
        .post("/balances/deposit/999") // Non-existent client
        .set("profile_id", "1") // Valid profile
        .send({ amount: 50 })
        .expect(404);

      expect(response.body).toHaveProperty("error", "Client not found");
    });

    // Removed the 'handle database errors gracefully' test from integration tests
  });

  describe("Concurrent Deposits", () => {
    it("should prevent deposits exceeding the 25% limit even with concurrent requests", async () => {
      // Reset balance and jobs
      await Profile.update({ balance: 1000 }, { where: { id: 1 } });
      await Job.update({ paid: false }, { where: {} });

      // Total unpaid jobs = 200 + 300 + 150 = 650
      // 25% of 650 = 162.5

      // Simulate two concurrent deposit requests
      const depositRequest = (amount) =>
        request(app)
          .post("/balances/deposit/1")
          .set("profile_id", "1") // Valid profile
          .send({ amount });

      const [response1, response2] = await Promise.all([
        depositRequest(125), // At the limit
        depositRequest(50), // Exceeds limit when combined
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
      expect(client.balance).toBe(1125); // 1000 + 125
    });
  });
});
