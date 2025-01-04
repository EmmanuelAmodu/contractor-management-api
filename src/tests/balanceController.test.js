// tests/balanceController.test.js
const { depositBalance } = require('../controllers/balanceController');
const { Profile, Job, Contract, sequelize } = require('../models/model');
const { depositSchema } = require('../utils/validation');
const Joi = require('joi');

jest.mock('../models');

describe('Balance Controller', () => {
  describe('depositBalance', () => {
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

    it('should deposit balance successfully when amount is within limit', async () => {
      const mockClient = { id: 1, type: 'client', balance: 100, save: jest.fn().mockResolvedValue(true) };
      Profile.findOne.mockResolvedValue(mockClient);
      Job.sum.mockResolvedValue(200); // Total jobs to pay

      await depositBalance(req, res);

      expect(depositSchema.validate).toHaveBeenCalledWith(req.body);
      expect(Profile.findOne).toHaveBeenCalledWith({ where: { id: 1, type: 'client' } });
      expect(Job.sum).toHaveBeenCalledWith('price', {
        where: { paid: false },
        include: {
          model: Contract,
          where: { ClientId: 1, status: 'in_progress' },
        },
      });
      expect(mockClient.balance).toBe(150); // 100 + 50
      expect(mockClient.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Deposit successful', balance: 150 });
    });

    it('should return 400 if deposit amount exceeds 25% of total jobs to pay', async () => {
      req.body.amount = 100; // 25% of 200 is 50
      const mockClient = { id: 1, type: 'client', balance: 100, save: jest.fn().mockResolvedValue(true) };
      Profile.findOne.mockResolvedValue(mockClient);
      Job.sum.mockResolvedValue(200); // Total jobs to pay

      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Deposit amount exceeds 25% of total jobs to pay' });
    });

    it('should return 400 for invalid deposit amount', async () => {
      req.body.amount = -50;
      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: '"amount" must be a positive number' });
    });

    it('should return 404 if client is not found', async () => {
      Profile.findOne.mockResolvedValue(null);

      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Client not found' });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      Profile.findOne.mockRejectedValue(error);

      await depositBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });
});
