const { sequelize, Profile, Contract, Job } = require('../model');

module.exports = {
  sequelize,
  Profile: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    sum: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    // Add other necessary mocked methods
  },
  Contract: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    // Add other necessary mocked methods
  },
  Job: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    sum: jest.fn(),
    // Add other necessary mocked methods
  },
};
