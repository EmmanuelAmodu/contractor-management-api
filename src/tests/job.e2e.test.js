const request = require('supertest');
const app = require('../app');
const { sequelize, Profile, Contract, Job, IdempotencyKey } = require('../models/model');
const { v4: uuidv4 } = require('uuid');

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
      { id: 3, description: 'Flying lessons', price: 500, paid: false, ContractId: 1 }, // Added for insufficient balance
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
      expect(response.body.length).toBe(2); // Jobs 1 and 3
      const jobIds = response.body.map(job => job.id);
      expect(jobIds).toContain(1);
      expect(jobIds).toContain(3);
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
    beforeEach(async () => {
      // Reset job 1 to unpaid and client balance to 1000 before each payment test
      await Job.update({ paid: false, paymentDate: null }, { where: { id: 1 } });
      await Job.update({ paid: false, paymentDate: null }, { where: { id: 3 } });
      await Profile.update({ balance: 1000 }, { where: { id: 1 } });
      // Clear IdempotencyKey table
      await IdempotencyKey.destroy({ where: {} });
    });

    it('should pay for a job successfully', async () => {
      const idempotencyKey = uuidv4();

      // Ensure client has sufficient balance
      await Profile.update({ balance: 1000 }, { where: { id: 1 } });

      const response = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Payment successful');
      expect(response.body.job).toHaveProperty('paid', true);
      expect(response.body.job).toHaveProperty('paymentDate');

      // Verify balances
      const client = await Profile.findByPk(1);
      const contractor = await Profile.findByPk(2);
      expect(client.balance).toBe(800); // 1000 - 200
      expect(contractor.balance).toBe(1700); // 1500 + 200
    });

    it('should return 404 if the job does not exist or does not belong to the profile', async () => {
      const idempotencyKey = uuidv4();

      const response = await request(app)
        .post('/jobs/999/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Job not found or access denied');
    });

    it('should return 400 if the job is already paid', async () => {
      const idempotencyKey = uuidv4();

      const response = await request(app)
        .post('/jobs/2/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Job is already paid');
    });

    it('should return 400 if the client has insufficient balance', async () => {
      const idempotencyKey = uuidv4();

      // Set client balance below job price for job 3
      await Profile.update({ balance: 100 }, { where: { id: 1 } });

      const response = await request(app)
        .post('/jobs/3/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient balance');
    });

    it('should return 401 if profile_id is missing', async () => {
      const idempotencyKey = uuidv4();

      const response = await request(app)
        .post('/jobs/1/pay')
        .set('Idempotency-Key', idempotencyKey)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const idempotencyKey = uuidv4();

      const response = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 999)
        .set('Idempotency-Key', idempotencyKey)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });

    it('should prevent double payments using the same idempotency key', async () => {
      const idempotencyKey = uuidv4();

      // First payment attempt
      const firstResponse = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(200);

      expect(firstResponse.body).toHaveProperty('message', 'Payment successful');

      // Second payment attempt with the same idempotency key
      const secondResponse = await request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 1)
        .set('Idempotency-Key', idempotencyKey)
        .expect(200);

      expect(secondResponse.body).toHaveProperty('message', 'Payment successful');
      expect(secondResponse.body.job).toHaveProperty('paid', true);
    });
  });
});
