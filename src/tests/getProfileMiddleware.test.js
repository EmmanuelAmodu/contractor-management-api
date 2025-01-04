// tests/getProfileMiddleware.test.js
const { getProfile } = require('../middleware/getProfile');
const { Profile } = require('../models/model');

jest.mock('../models/model');

describe('getProfile Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      get: jest.fn(),
      app: { get: jest.fn() },
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

  it('should attach profile to req and call next if profile_id is valid', async () => {
    const mockProfile = { id: 1, firstName: 'Harry', type: 'client' };
    req.get.mockReturnValue('1');
    Profile.findOne.mockResolvedValue(mockProfile);

    await getProfile(req, res, next);

    expect(req.get).toHaveBeenCalledWith('profile_id');
    expect(Profile.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(req.profile).toBe(mockProfile);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if profile_id header is missing', async () => {
    req.get.mockReturnValue(null);

    await getProfile(req, res, next);

    expect(req.get).toHaveBeenCalledWith('profile_id');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing profile_id header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if profile is not found', async () => {
    req.get.mockReturnValue('999');
    Profile.findOne.mockResolvedValue(null);

    await getProfile(req, res, next);

    expect(Profile.findOne).toHaveBeenCalledWith({ where: { id: '999' } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Profile not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    req.get.mockReturnValue('1');
    Profile.findOne.mockRejectedValue(error);

    await getProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    expect(next).not.toHaveBeenCalled();
  });
});
