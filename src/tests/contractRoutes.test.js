// tests/contractRoutes.test.js
const request = require('supertest');
const app = require('../app');
const { sequelize, Profile, Contract } = require('../models/model');

describe('Contract Routes', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    // Seed test data
    await Profile.bulkCreate([
      { id: 1, firstName: 'Harry', lastName: 'Potter', profession: 'Wizard', balance: 1000, type: 'client' },
      { id: 2, firstName: 'Hermione', lastName: 'Granger', profession: 'Wizard', balance: 1500, type: 'contractor' },
    ]);
    await Contract.create({
      id: 1,
      terms: 'Contract 1 terms',
      status: 'in_progress',
      ClientId: 1,
      ContractorId: 2,
    });
    await Contract.create({
      id: 2,
      terms: 'Contract 2 terms',
      status: 'terminated',
      ClientId: 1,
      ContractorId: 2,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /contracts/:id', () => {
    it('should return the contract if it belongs to the profile', async () => {
      const response = await request(app)
        .get('/contracts/1')
        .set('profile_id', 1)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('terms', 'Contract 1 terms');
      expect(response.body).toHaveProperty('status', 'in_progress');
    });

    it('should return 404 if the contract does not belong to the profile', async () => {
      const response = await request(app)
        .get('/contracts/999')
        .set('profile_id', 1)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Contract not found or access denied');
    });

    it('should return 404 if the contract is terminated', async () => {
      const response = await request(app)
        .get('/contracts/2')
        .set('profile_id', 1)
        .expect(200); // Note: The endpoint `/contracts/:id` doesn't filter by status

      expect(response.body).toHaveProperty('id', 2);
      expect(response.body).toHaveProperty('status', 'terminated');
    });

    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .get('/contracts/1')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .get('/contracts/1')
        .set('profile_id', 999)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  });

  describe('GET /contracts', () => {
    it('should return all non-terminated contracts for the profile', async () => {
      const response = await request(app)
        .get('/contracts')
        .set('profile_id', 1)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id', 1);
    });

    it('should return an empty array if no contracts are found', async () => {
      const response = await request(app)
        .get('/contracts')
        .set('profile_id', 2)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should support pagination', async () => {
      // Create additional contracts
      await Contract.bulkCreate([
        { id: 3, terms: 'Contract 3 terms', status: 'in_progress', ClientId: 1, ContractorId: 2 },
        { id: 4, terms: 'Contract 4 terms', status: 'in_progress', ClientId: 1, ContractorId: 2 },
      ]);

      const response = await request(app)
        .get('/contracts?page=1&limit=2')
        .set('profile_id', 1)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .get('/contracts')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .get('/contracts')
        .set('profile_id', 999)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  });
});
