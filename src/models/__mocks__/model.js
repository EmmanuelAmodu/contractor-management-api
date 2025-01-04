module.exports = {
  sequelize: {
    fn: jest.fn((fnName, ...args) => `${fnName}(${args.join(', ')})`), // Return string representation
    col: jest.fn((colName) => colName), // Return the column name as string
    literal: jest.fn((literalString) => literalString), // Return the literal string as is
    Transaction: {
      ISOLATION_LEVELS: {
        READ_UNCOMMITTED: 'READ UNCOMMITTED',
        READ_COMMITTED: 'READ COMMITTED',
        REPEATABLE_READ: 'REPEATABLE READ',
        SERIALIZABLE: 'SERIALIZABLE',
      },
      LOCK: {
        UPDATE: 'UPDATE',
        SHARE: 'SHARE',
      },
    },
    Op: {
      or: Symbol.for('or'),
      ne: Symbol.for('ne'),
      between: Symbol.for('between'),
    },
  },
  Profile: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    sum: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  Contract: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Job: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    sum: jest.fn(),
  },
  IdempotencyKey: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
};
