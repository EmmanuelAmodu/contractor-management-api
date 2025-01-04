// tests/jobController.test.js
const { getUnpaidJobs, payJob } = require('../controllers/jobController');
const { Job, Contract, Profile, sequelize } = require('../models/model');

jest.mock('../models'); // Mock models

describe('Job Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUnpaidJobs', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        profile: { id: 1 },
      };
      res = {
        json: jest.fn(),
      };
    });

    it('should return all unpaid jobs for active contracts', async () => {
      const mockJobs = [
        { id: 1, paid: false, Contract: { ClientId: 1, ContractorId: 2, status: 'in_progress' } },
        { id: 2, paid: false, Contract: { ClientId: 3, ContractorId: 1, status: 'in_progress' } },
      ];
      Job.findAll.mockResolvedValue(mockJobs);

      await getUnpaidJobs(req, res);

      expect(Job.findAll).toHaveBeenCalledWith({
        where: { paid: false },
        include: {
          model: Contract,
          where: {
            [Contract.sequelize.Op.or]: [{ ClientId: 1 }, { ContractorId: 1 }],
            status: 'in_progress',
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith(mockJobs);
    });

    it('should return an empty list if no unpaid jobs are found', async () => {
      Job.findAll.mockResolvedValue([]);

      await getUnpaidJobs(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      Job.findAll.mockRejectedValue(error);

      await getUnpaidJobs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  describe('payJob', () => {
    let req;
    let res;
    let transaction;

    beforeEach(() => {
      req = {
        params: { job_id: 1 },
        profile: { id: 1 },
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

    it('should pay for a job successfully', async () => {
      const mockJob = {
        id: 1,
        paid: false,
        price: 100,
        Contract: {
          ClientId: 1,
          Contractor: { id: 2, balance: 50 },
        },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockClient = { id: 1, balance: 200, save: jest.fn().mockResolvedValue(true) };
      req.profile = mockClient;

      Job.findOne.mockResolvedValue(mockJob);

      await payJob(req, res);

      expect(Job.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          model: Contract,
          where: { ClientId: 1 },
          include: { model: Profile, as: 'Contractor' },
        },
      });

      expect(mockClient.balance).toBe(100); // 200 - 100
      expect(mockJob.Contract.Contractor.balance).toBe(150); // 50 + 100
      expect(mockJob.paid).toBe(true);
      expect(mockJob.paymentDate).toBeInstanceOf(Date);
      expect(mockClient.save).toHaveBeenCalledWith({ transaction });
      expect(mockJob.save).toHaveBeenCalledWith({ transaction });
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Payment successful',
        job: mockJob,
      });
    });

    it('should return 404 if job is not found or access denied', async () => {
      Job.findOne.mockResolvedValue(null);

      await payJob(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Job not found or access denied' });
    });

    it('should return 400 if job is already paid', async () => {
      const mockJob = { paid: true };
      Job.findOne.mockResolvedValue(mockJob);

      await payJob(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Job is already paid' });
    });

    it('should return 400 if client has insufficient balance', async () => {
      const mockJob = {
        id: 1,
        paid: false,
        price: 300,
        Contract: {
          ClientId: 1,
          Contractor: { id: 2, balance: 50 },
        },
      };
      const mockClient = { id: 1, balance: 200 };
      req.profile = mockClient;

      Job.findOne.mockResolvedValue(mockJob);

      await payJob(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient balance' });
    });

    it('should handle transaction errors gracefully', async () => {
      const mockJob = {
        id: 1,
        paid: false,
        price: 100,
        Contract: {
          ClientId: 1,
          Contractor: { id: 2, balance: 50 },
        },
        save: jest.fn().mockRejectedValue(new Error('Save error')),
      };
      const mockClient = { id: 1, balance: 200, save: jest.fn().mockResolvedValue(true) };
      req.profile = mockClient;

      Job.findOne.mockResolvedValue(mockJob);

      await payJob(req, res);

      expect(transaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payment failed',
        details: 'Save error',
      });
    });
  });
});