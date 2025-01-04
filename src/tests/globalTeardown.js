const { sequelize } = require("../models/model");

module.exports = async () => {
  await sequelize.close(); // Ensures all connections are closed, fix open handle issues
};
