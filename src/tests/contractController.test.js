const { getContractById, getContracts } = require('../controllers/contractController');
const { Contract } = require('../models/model');

jest.mock("../models/model"); // Mock models

describe('Contract Controller', () => {
  describe('getContractById', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
      req = {
        params: { id: 1 },
        profile: { id: 1 },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return a contract if it exists and belongs to the profile', async () => {
      const mockContract = { id: 1, ClientId: 1, ContractorId: 2 };
      Contract.findOne.mockResolvedValue(mockContract);

      await getContractById(req, res, next);

      expect(Contract.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          [Contract.sequelize.Op.or]: [{ ClientId: 1 }, { ContractorId: 1 }],
        },
      });
      expect(res.json).toHaveBeenCalledWith(mockContract);
    });

    it('should return 404 if the contract does not exist', async () => {
      Contract.findOne.mockResolvedValue(null);

      await getContractById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contract not found or access denied' });
    });

    it('should return 404 if the contract does not belong to the profile', async () => {
      const mockContract = { id: 1, ClientId: 2, ContractorId: 3 };
      Contract.findOne.mockResolvedValue(null);

      await getContractById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contract not found or access denied' });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      Contract.findOne.mockRejectedValue(error);

      await getContractById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  describe('getContracts', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
      req = {
        profile: { id: 1 },
        query: { page: '1', limit: '10' },
        app: {
          get: jest.fn().mockReturnValue({
            Contract,
          }),
        },
      };
      res = {
        json: jest.fn(),
      };
      next = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return a list of contracts for the profile with pagination', async () => {
      const mockContracts = [
        { id: 1, ClientId: 1, ContractorId: 2, status: 'in_progress' },
        { id: 2, ClientId: 1, ContractorId: 3, status: 'new' },
      ];
      Contract.findAll.mockResolvedValue(mockContracts);

      await getContracts(req, res, next);

      expect(Contract.findAll).toHaveBeenCalledWith({
        where: {
          [Op.or]: [{ ClientId: 1 }, { ContractorId: 1 }],
          status: { [Op.ne]: 'terminated' },
        },
        limit: 10,
        offset: 0,
      });
      expect(res.json).toHaveBeenCalledWith(mockContracts);
    });

    it('should handle empty contract list', async () => {
      Contract.findAll.mockResolvedValue([]);

      await getContracts(req, res, next);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      Contract.findAll.mockRejectedValue(error);

      await getContracts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });
});
