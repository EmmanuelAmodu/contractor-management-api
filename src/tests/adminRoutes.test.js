const request = require('supertest');
const app = require('../app'); // Import your Express app
const { sequelize, Job, Contract, Profile } = require('../models/model');

describe('Admin Routes', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Reset database

    // Seed test data
    await Profile.bulkCreate([
      { id: 1, firstName: 'Harry', lastName: 'Potter', profession: 'Wizard', balance: 1000, type: 'client' },
      { id: 2, firstName: 'Hermione', lastName: 'Granger', profession: 'Wizard', balance: 1500, type: 'contractor' },
      { id: 3, firstName: 'Ron', lastName: 'Weasley', profession: 'Wizard', balance: 500, type: 'client' },
    ]);
    await Contract.bulkCreate([
      { id: 1, terms: 'Contract 1 terms', status: 'in_progress', ClientId: 1, ContractorId: 2 },
      { id: 2, terms: 'Contract 2 terms', status: 'in_progress', ClientId: 3, ContractorId: 2 },
    ]);
    await Job.bulkCreate([
      { id: 1, description: 'Magic lessons', price: 200, paid: true, paymentDate: '2020-08-15', ContractId: 1 },
      { id: 2, description: 'Advanced spells', price: 300, paid: true, paymentDate: '2020-08-16', ContractId: 1 },
      { id: 3, description: 'Defense Against the Dark Arts', price: 150, paid: true, paymentDate: '2020-08-17', ContractId: 2 },
    ]);
  });

  afterAll(async () => {
    await sequelize.close(); // Close connection after tests
  });

  describe('GET /admin/best-profession', () => {
    it('should return the best profession within the date range', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .set('profile_id', '1') // Profile ID as string
        .expect(200);

      expect(response.body).toHaveProperty('profession', 'Wizard');
      expect(response.body).toHaveProperty('total_earned', 650);
    });

    it('should return 404 if no professions are found', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=2021-01-01&end=2021-01-31')
        .set('profile_id', '1')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'No professions found');
    });

    it('should return 400 if start or end dates are missing', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10')
        .set('profile_id', '1')
        .expect(400);

      expect(response.body).toHaveProperty('error', '"end" is required');
    });

    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });

    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .set('profile_id', '999') // Assuming 999 does not exist
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  });

  describe('GET /admin/best-clients', () => {
    it('should return the top clients within the date range', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=2020-08-10&end=2020-08-20&limit=2')
        .set('profile_id', '1')
        .expect(200);
  
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('fullName', 'Harry Potter');
      expect(response.body[0]).toHaveProperty('total_paid', '500');
      expect(response.body[1]).toHaveProperty('id', 3);
      expect(response.body[1]).toHaveProperty('fullName', 'Ron Weasley');
      expect(response.body[1]).toHaveProperty('total_paid', '150');
    });
  
    it('should apply default limit if not specified', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=2020-08-10&end=2020-08-20')
        .set('profile_id', '1')
        .expect(200);
  
      expect(response.body.length).toBe(2); // Default limit is 2
      expect(response.body[0]).toHaveProperty('total_paid', '500');
      expect(response.body[1]).toHaveProperty('total_paid', '150');
    });
  
    it('should return an empty array if no clients are found', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=2021-01-01&end=2021-01-31')
        .set('profile_id', '1')
        .expect(200);
  
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  
    it('should return 400 if start or end dates are missing', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=2020-08-10')
        .set('profile_id', '1')
        .expect(400);
  
      expect(response.body).toHaveProperty('error', '"end" is required');
    });
  
    it('should return 401 if profile_id is missing', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=2020-08-10&end=2020-08-20')
        .expect(401);
  
      expect(response.body).toHaveProperty('error', 'Missing profile_id header');
    });
  
    it('should return 401 if profile_id is invalid', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=2020-08-10&end=2020-08-20')
        .set('profile_id', '999') // Assuming 999 does not exist
        .expect(401);
  
      expect(response.body).toHaveProperty('error', 'Profile not found');
    });
  
    it('should return 400 for invalid date formats', async () => {
      const response = await request(app)
        .get('/admin/best-clients?start=invalid-date&end=2020-08-20')
        .set('profile_id', '1')
        .expect(400);
  
      expect(response.body).toHaveProperty('error', '"start" must be in ISO 8601 date format');
    });
  });

  describe('Additional Tests', () => {
    it('should return best profession correctly with overlapping date ranges', async () => {      
      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .set('profile_id', '1')
        .expect(200);

      expect(response.body).toHaveProperty('profession', 'Wizard');
      expect(response.body).toHaveProperty('total_earned', 650);
    });

    it('should handle invalid date formats gracefully', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=invalid-date&end=2020-08-20')
        .set('profile_id', '1')
        .expect(400);

      expect(response.body).toHaveProperty('error', '"start" must be in ISO 8601 date format');
    });
  });
});
