const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const logger = require('./utils/logger');
const { sequelize } = require('./models/model');
const { getProfile } = require('./middleware/getProfile');

const contractRoutes = require('./routes/contractRoutes');
const jobRoutes = require('./routes/jobRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Swagger Setup
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Deel Backend Task API',
            version: '1.0.0',
            description: 'API documentation for the Deel Backend Task',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT}`,
            },
        ],
    },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Security Middlewares
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

// Routes
app.use(contractRoutes);
app.use(jobRoutes);
app.use(balanceRoutes);
app.use(adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Deel Backend Task API' });
});

// Error Handling Middleware
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
