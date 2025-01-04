const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

init();

async function init() {
  try {
    await app.get('sequelize').authenticate();
    logger.info('Database connected successfully.');

    app.listen(PORT, () => {
      logger.info(`Express App Listening on Port ${PORT}`);
    });
  } catch (error) {
    logger.error(`An error occurred: ${error.message}`);
    process.exit(1);
  }
}
