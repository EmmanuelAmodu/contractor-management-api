module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  globalTeardown: '<rootDir>/src/tests/globalTeardown.js',
  globalSetup: '<rootDir>/src/tests/globalSetup.js',
};
