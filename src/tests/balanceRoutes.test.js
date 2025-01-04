// tests/balanceRoutes.test.js
const request = require('supertest');
const app = require('../app');
const { sequelize, Profile, Contract, Job } = require('../models');

describe('Balance Routes', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    // Seed test data
    await Profile.bulkCreate([
      { id: 1, firstName: 'Harry', lastName: 'Potter', profession: 'Wizard', balance: 1000, type: 'client' },
      { id: 2, firstName: 'Hermione', lastName: 'Granger', profession: 'Wizard', balance: 1500, type: 'contractor' },
    ]);
    await Contract.bulkCreate([
      { id: 1, terms: 'Contract 1 terms', status: 'in_progress', ClientId: 1, ContractorId: 2 },
    ]);
    await Job.bulkCreate([
      { id: 1, description: 'Magic lessons', price: 200, paid: false, ContractId: 1 },
      { id: 2, description: 'Advanced spells', price: 300, paid: false, ContractId: 1 },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /balances/deposit/:userId', () => {
    it('should deposit balance successfully within the limit', async () => {
      const response = await request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 1)
        .send({ amount: 50 }) // 25% of total jobs to pay (200 + 300) = 125
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Deposit successful');
      expect(response.body).toHaveProperty('balance', 1050);
    });

    it('should return 400 if deposit amount exceeds 25% of total jobs to pay', async () => {
      const response = await request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 1)
        .send({ amount: 100 }) // Exceeds 25% of 500 (which is 125)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Deposit amount exceeds 25% of total jobs to pay');
    });

    it('should return 400 for invalid deposit amount', async () => {
      const response = await request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 1)
        .send({ amount: -50 })
        .expect(400);

      expect(response.body).toHaveProperty('error', '"amount" must be a positive number');
    });

    it('should return 404 if client is not found', async () => {
      const response = await request(app)
        .post('/balances/deposit/999')
        .set('profile_id', 1)
        .send({ amount: 50 })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Client not found');
    });

    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .post('/balances/deposit/1')
        .send({ amount: 50 })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 999)
        .send({ amount: 50 })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  });
});
