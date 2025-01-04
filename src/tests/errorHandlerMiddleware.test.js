// tests/errorHandlerMiddleware.test.js
const { errorHandler } = require('../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let err;
  let req;
  let res;
  let next;

  beforeEach(() => {
    err = new Error('Test error');
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should respond with 500 and error message', () => {
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});