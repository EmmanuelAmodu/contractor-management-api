const request = require('supertest');
const app = require('../app');

const { getBestProfession, getBestClients } = require('../controllers/adminController');
const { Job, Contract, Profile, sequelize } = require('../models/model');
const { Op, col, fn, literal } = sequelize; // Import from mocked sequelize

jest.mock('../models/model');

describe('Admin Controller', () => {
  describe('getBestProfession', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        query: { start: '2020-08-10', end: '2020-08-20' },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the best profession within the date range', async () => {
      const mockBestProfession = [
        { profession: 'Programmer', total_earned: 'SUM(price)' },
      ];
      Job.findAll.mockResolvedValue(mockBestProfession);

      await getBestProfession(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        attributes: [
          ['Contract.Contractor.profession', 'profession'],
          ['SUM(price)', 'total_earned'],
        ],
        where: {
          paid: true,
          paymentDate: {
            [Op.between]: [new Date('2020-08-10'), new Date('2020-08-20')],
          },
        },
        include: {
          model: Contract,
          include: {
            model: Profile,
            as: 'Contractor',
            attributes: [],
          },
        },
        group: ['profession'],
        order: [['SUM(price)', 'DESC']],
        limit: 1,
      });
      expect(res.json).toHaveBeenCalledWith(mockBestProfession[0]);
    });

    it('should return 404 if no professions are found', async () => {
      Job.findAll.mockResolvedValue([]);

      await getBestProfession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No professions found' });
    });

    it('should return 400 if start or end dates are missing', async () => {
      req.query = { start: '2020-08-10' }; // Missing end
      await getBestProfession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: '"end" is required' });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      Job.findAll.mockRejectedValue(error);

      await getBestProfession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  describe('getBestClients', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        query: { start: '2020-08-10', end: '2020-08-20', limit: '2' },
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the top clients within the date range', async () => {
      const mockBestClients = [
        { 'Contract.Client.id': 1, fullName: 'Harry Potter', paid: 'SUM(price)' },
        { 'Contract.Client.id': 2, fullName: 'Mr Robot', paid: 'SUM(price)' },
      ];
      Job.findAll.mockResolvedValue(mockBestClients);

      await getBestClients(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        attributes: [
          'Contract.Client.id',
          [`Client.firstName || ' ' || Client.lastName`, 'fullName'],
          ['SUM(price)', 'paid'],
        ],
        where: {
          paid: true,
          paymentDate: {
            [Op.between]: [new Date('2020-08-10'), new Date('2020-08-20')],
          },
        },
        include: {
          model: Contract,
          include: {
            model: Profile,
            as: 'Client',
            attributes: [],
          },
        },
        group: ['Contract.Client.id'],
        order: [['SUM(price)', 'DESC']],
        limit: 2,
      });

      expect(res.json).toHaveBeenCalledWith(mockBestClients);
    });

    it('should apply default limit if not provided', async () => {
      req.query = { start: '2020-08-10', end: '2020-08-20' };
      const mockBestClients = [
        { 'Contract.Client.id': 1, fullName: 'Harry Potter', paid: 'SUM(price)' },
        { 'Contract.Client.id': 2, fullName: 'Mr Robot', paid: 'SUM(price)' },
      ];
      Job.findAll.mockResolvedValue(mockBestClients);

      await getBestClients(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        attributes: [
          'Contract.Client.id',
          [`Client.firstName || ' ' || Client.lastName`, 'fullName'],
          ['SUM(price)', 'paid'],
        ],
        where: {
          paid: true,
          paymentDate: {
            [Op.between]: [new Date('2020-08-10'), new Date('2020-08-20')],
          },
        },
        include: {
          model: Contract,
          include: {
            model: Profile,
            as: 'Client',
            attributes: [],
          },
        },
        group: ['Contract.Client.id'],
        order: [['SUM(price)', 'DESC']],
        limit: 2, // Default limit
      });

      expect(res.json).toHaveBeenCalledWith(mockBestClients);
    });

    it('should handle empty client list', async () => {
      Job.findAll.mockResolvedValue([]);

      await getBestClients(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 400 if start or end dates are missing', async () => {
      req.query = { start: '2020-08-10' }; // Missing end
      await getBestClients(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: '"end" is required' });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      Job.findAll.mockRejectedValue(error);

      await getBestClients(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  describe('Additional Tests', () => {
    it('should return best profession correctly with overlapping date ranges', async () => {
      const mockBestProfession = [
        { profession: 'Wizard', total_earned: 'SUM(price)' },
      ];
      Job.findAll.mockResolvedValue(mockBestProfession);

      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .set('profile_id', 1)
        .expect(200);

      expect(response.body).toHaveProperty('profession', 'Wizard');
      expect(response.body).toHaveProperty('total_earned', 'SUM(price)');
    });

    it('should handle invalid date formats gracefully', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=invalid-date&end=2020-08-20')
        .set('profile_id', 1)
        .expect(400);

      expect(response.body).toHaveProperty('error', '"start" must be a valid date');
    });
  });
});
