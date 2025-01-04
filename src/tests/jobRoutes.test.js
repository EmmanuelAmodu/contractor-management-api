// tests/jobRoutes.test.js
const request = require('supertest');
const app = require('../app');
const { sequelize, Profile, Contract, Job } = require('../models/model');

describe('Job Routes', () => {
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
      { id: 2, description: 'Advanced spells', price: 300, paid: true, paymentDate: '2020-08-15', ContractId: 1 },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /jobs/unpaid', () => {
    it('should return all unpaid jobs for the profile', async () => {
      const response = await request(app)
        .get('/jobs/unpaid')
        .set('profile_id', 1)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id', 1);
    });

    it('should return an empty array if no unpaid jobs are found', async () => {
      const response = await request(app)
        .get('/jobs/unpaid')
        .set('profile_id', 2)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .get('/jobs/unpaid')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .get('/jobs/unpaid')
        .set('profile_id', 999)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  });

  describe('POST /jobs/:job_id/pay', () => {
    it('should pay for a job successfully', async () => {
      // Ensure client has sufficient balance
      await Profile.update({ balance: 1000 }, { where: { id: 1 } });

      const response = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 1)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Payment successful');
      expect(response.body.job).toHaveProperty('paid', true);
      expect(response.body.job).toHaveProperty('paymentDate');
    });

    it('should return 404 if the job does not exist or does not belong to the profile', async () => {
      const response = await request(app)
        .post('/jobs/999/pay')
        .set('profile_id', 1)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Job not found or access denied');
    });

    it('should return 400 if the job is already paid', async () => {
      const idempotencyKey = 'unique-key-123';

      const response = await request(app)
        .post('/jobs/2/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Job is already paid');
    });

    it('should return 400 if the client has insufficient balance', async () => {
      const idempotencyKey = 'unique-key-123';

      // Set client balance below job price
      await Profile.update({ balance: 100 }, { where: { id: 1 } });

      const response = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient balance');
    });

    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .post('/jobs/1/pay')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 999)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  });
});
