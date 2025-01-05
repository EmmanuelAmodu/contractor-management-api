// src/tests/adminController.test.js

const { getBestProfession, getBestClients } = require('../controllers/adminController');
const { Job, Contract, Profile, sequelize } = require('../models/model');
const { Op, col, fn, literal } = require('sequelize');
const Joi = require('joi');

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
        { profession: 'Programmer', total_earned: 1000 },
      ];
      Job.findAll.mockResolvedValue(mockBestProfession);

      await getBestProfession(req, res);

      expect(Job.findAll).toHaveBeenCalledWith(expect.objectContaining({
        attributes: expect.arrayContaining([
          expect.arrayContaining(['profession']),
          expect.arrayContaining(['total_earned']),
        ]),
        where: expect.objectContaining({
          paid: true,
          paymentDate: expect.objectContaining({
            [Op.between]: [new Date('2020-08-10'), new Date('2020-08-20')],
          }),
        }),
        include: expect.objectContaining({
          model: Contract,
          include: expect.objectContaining({
            model: Profile,
            as: 'Contractor',
            attributes: [],
          }),
        }),
        group: ['profession'],
        order: expect.any(Array),
        limit: 1,
      }));
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
        { id: 1, fullName: 'Harry Potter', total_paid: 500 },
        { id: 2, fullName: 'Mr Robot', total_paid: 400 },
      ];
      Job.findAll.mockResolvedValue(mockBestClients);

      await getBestClients(req, res);

      expect(Job.findAll).toHaveBeenCalledWith(expect.objectContaining({
        attributes: expect.arrayContaining([
          expect.any(Object), // [col('Contract.Client.id'), 'id']
          expect.any(Object), // [literal("`Contract->Client`.firstName || ' ' || `Contract->Client`.lastName"), 'fullName']
          expect.any(Object), // [fn('SUM', col('price')), 'total_paid']
        ]),
        where: expect.objectContaining({
          paid: true,
          paymentDate: expect.objectContaining({
            [Op.between]: [new Date('2020-08-10'), new Date('2020-08-20')],
          }),
        }),
        include: expect.objectContaining({
          model: Contract,
          include: expect.objectContaining({
            model: Profile,
            as: 'Client',
            attributes: ['firstName', 'lastName'],
          }),
        }),
        group: ['Contract.Client.id'],
        order: expect.any(Array),
        limit: 2,
      }));

      expect(res.json).toHaveBeenCalledWith(mockBestClients);
    });

    it('should apply default limit if not provided', async () => {
      req.query = { start: '2020-08-10', end: '2020-08-20' };
      const mockBestClients = [
        { id: 1, fullName: 'Harry Potter', total_paid: 500 },
        { id: 2, fullName: 'Mr Robot', total_paid: 400 },
      ];
      Job.findAll.mockResolvedValue(mockBestClients);

      await getBestClients(req, res);

      expect(Job.findAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 2, // Default limit
      }));

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
});
