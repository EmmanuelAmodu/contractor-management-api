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
                url: `http://localhost:${process.env.PORT || 3001}`,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                // Profile Schema
                Profile: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1,
                        },
                        firstName: {
                            type: 'string',
                            example: 'Albus',
                        },
                        lastName: {
                            type: 'string',
                            example: 'Dumbledore',
                        },
                        profession: {
                            type: 'string',
                            example: 'Headmaster',
                        },
                        balance: {
                            type: 'number',
                            format: 'double',
                            example: 10000.00,
                        },
                        type: {
                            type: 'string',
                            enum: ['client', 'contractor', 'admin'],
                            example: 'admin',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: "2023-01-01T00:00:00.000Z",
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: "2023-01-10T00:00:00.000Z",
                        },
                    },
                },
                // Contract Schema
                Contract: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1,
                        },
                        terms: {
                            type: 'string',
                            example: "Provide advanced magic lessons.",
                        },
                        status: {
                            type: 'string',
                            enum: ['new', 'in_progress', 'terminated'],
                            example: "terminated",
                        },
                        ClientId: {
                            type: 'integer',
                            example: 2,
                        },
                        ContractorId: {
                            type: 'integer',
                            example: 5,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: "2023-01-01T00:00:00.000Z",
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: "2023-01-10T00:00:00.000Z",
                        },
                    },
                },
                // Job Schema
                Job: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1,
                        },
                        description: {
                            type: 'string',
                            example: "Develop secure authentication module.",
                        },
                        price: {
                            type: 'number',
                            format: 'double',
                            example: 200.00,
                        },
                        paid: {
                            type: 'boolean',
                            example: false,
                        },
                        paymentDate: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            example: null,
                        },
                        ContractId: {
                            type: 'integer',
                            example: 1,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: "2023-01-01T00:00:00.000Z",
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: "2023-01-10T00:00:00.000Z",
                        },
                    },
                },
                // Pay Job Response Schema
                PayJobResponse: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: "Payment successful",
                        },
                        job: {
                            $ref: '#/components/schemas/Job',
                        },
                    },
                },
                // Error Response Schema
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            example: 'An unexpected error occurred',
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'],
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
