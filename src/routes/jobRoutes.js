const express = require('express');
const router = express.Router();
const { getUnpaidJobs, payJob } = require('../controllers/jobController');
const { getProfile } = require('../middleware/getProfile');
const { idempotency } = require('../middleware/idempotency');
const { financialLimiter } = require('../middleware/rateLimiter'); // Assuming you have a rateLimiter middleware

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Operations related to jobs
 */

/**
 * @swagger
 * /jobs/unpaid:
 *   get:
 *     summary: Retrieve all unpaid jobs for the authenticated user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Profile ID of the authenticated user
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of unpaid jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *             example:
 *               - id: 1
 *                 description: "Develop secure authentication module."
 *                 price: 200.00
 *                 paid: false
 *                 paymentDate: null
 *                 ContractId: 1
 *                 createdAt: "2023-01-01T00:00:00.000Z"
 *                 updatedAt: "2023-01-10T00:00:00.000Z"
 *               - id: 2
 *                 description: "Design hacking framework."
 *                 price: 201.00
 *                 paid: false
 *                 paymentDate: null
 *                 ContractId: 2
 *                 createdAt: "2023-01-02T00:00:00.000Z"
 *                 updatedAt: "2023-01-11T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Missing or invalid authentication token"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "An unexpected error occurred"
 */
router.get('/jobs/unpaid', getProfile, getUnpaidJobs);

/**
 * @swagger
 * /jobs/{job_id}/pay:
 *   post:
 *     summary: Pay for a specific job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the job to pay for
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Profile ID of the authenticated user (client) making the payment
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           example: "unique-key-12345"
 *         description: Unique key to ensure idempotent payments
 *     responses:
 *       200:
 *         description: Payment successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayJobResponse'
 *             example:
 *               message: "Payment successful"
 *               job:
 *                 id: 1
 *                 description: "Develop secure authentication module."
 *                 price: 200.00
 *                 paid: true
 *                 paymentDate: "2023-01-15T12:00:00.000Z"
 *                 ContractId: 1
 *                 createdAt: "2023-01-01T00:00:00.000Z"
 *                 updatedAt: "2023-01-15T12:00:00.000Z"
 *       400:
 *         description: Bad Request - Invalid input or deposit exceeds allowed limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Insufficient balance"
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Missing or invalid authentication token"
 *       403:
 *         description: Forbidden - Access restricted to the contract's client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Forbidden: You do not have access to this job"
 *       404:
 *         description: Not Found - Job does not exist or is already paid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Job not found or already paid"
 *       409:
 *         description: Conflict - Duplicate payment attempt detected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Duplicate payment detected"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "An unexpected error occurred"
 */
router.post('/jobs/:job_id/pay', financialLimiter, getProfile, idempotency, payJob);

module.exports = router;
