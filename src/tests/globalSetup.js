const { sequelize } = require('../models/model');

module.exports = async () => {
    await sequelize.sync({ force: true });
    // jest.resetAllMocks();
};