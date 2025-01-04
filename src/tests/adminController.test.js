// tests/adminController.test.js
const { getBestProfession, getBestClients } = require('../controllers/adminController');
const { Job, Contract, Profile, sequelize } = require('../models/model');
const { Op } = require('sequelize');

jest.mock("../models/model"); // Mock models

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
        { profession: 'Programmer', total_earned: 5000 },
      ];
      Job.findAll.mockResolvedValue(mockBestProfession);

      await getBestProfession(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        attributes: [
          ['Contract.Contractor.profession', 'profession'],
          [sequelize.fn('SUM', sequelize.col('price')), 'total_earned'],
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
        order: [[sequelize.fn('SUM', sequelize.col('price')), 'DESC']],
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
      expect(res.json).toHaveBeenCalledWith({ error: '\"end\" is required' });
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
        { 'Contract.Client.id': 1, fullName: 'Harry Potter', paid: 5000 },
        { 'Contract.Client.id': 2, fullName: 'Mr Robot', paid: 3000 },
      ];
      Job.findAll.mockResolvedValue(mockBestClients);

      await getBestClients(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        attributes: [
          'Contract.Client.id',
          [sequelize.literal(`Client.firstName || ' ' || Client.lastName`), 'fullName'],
          [sequelize.fn('SUM', sequelize.col('price')), 'paid'],
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
        order: [[sequelize.fn('SUM', sequelize.col('price')), 'DESC']],
        limit: 2,
      });

      expect(res.json).toHaveBeenCalledWith(mockBestClients);
    });

    it('should apply default limit if not provided', async () => {
      req.query = { start: '2020-08-10', end: '2020-08-20' };
      const mockBestClients = [
        { 'Contract.Client.id': 1, fullName: 'Harry Potter', paid: 5000 },
        { 'Contract.Client.id': 2, fullName: 'Mr Robot', paid: 3000 },
      ];
      Job.findAll.mockResolvedValue(mockBestClients);

      await getBestClients(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        attributes: [
          'Contract.Client.id',
          [sequelize.literal(`Client.firstName || ' ' || Client.lastName`), 'fullName'],
          [sequelize.fn('SUM', sequelize.col('price')), 'paid'],
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
        order: [[sequelize.fn('SUM', sequelize.col('price')), 'DESC']],
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
      expect(res.json).toHaveBeenCalledWith({ error: '\"end\" is required' });
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
      // Seed additional jobs with overlapping dates
      await Job.create({
        id: 4,
        description: 'Herbology Lessons',
        price: 400,
        paid: true,
        paymentDate: '2020-08-18',
        ContractId: 1,
      });

      const response = await request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .set('profile_id', 1)
        .expect(200);

      expect(response.body).toHaveProperty('profession', 'Wizard');
      expect(response.body).toHaveProperty('total_earned', '1050'); // 200 + 300 + 150 + 400
    });

    it('should handle invalid date formats gracefully', async () => {
      const response = await request(app)
        .get('/admin/best-profession?start=invalid-date&end=2020-08-20')
        .set('profile_id', 1)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid date format');
    });
  });
});
