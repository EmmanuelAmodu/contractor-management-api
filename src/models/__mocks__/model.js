module.exports = {
  sequelize: {
    transaction: jest.fn().mockImplementation(() => {
      return {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
    }),
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
