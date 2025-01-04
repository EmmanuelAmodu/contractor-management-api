const express = require('express');
const router = express.Router();
const { getUnpaidJobs, payJob } = require('../controllers/jobController');
const { getProfile } = require('../middleware/getProfile');
const { idempotency } = require('../middleware/idempotency');
const { financialLimiter } = require('../middleware/rateLimiter'); // Assuming you have a rateLimiter middleware

/**
 * @swagger
 * /jobs/unpaid:
 *   get:
 *     summary: Get all unpaid jobs for the authenticated user
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID of the user
 *     responses:
 *       200:
 *         description: List of unpaid jobs
 *       401:
 *         description: Unauthorized
 */
router.get('/jobs/unpaid', getProfile, getUnpaidJobs);

/**
 * @swagger
 * /jobs/{job_id}/pay:
 *   post:
 *     summary: Pay for a specific job
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID to pay for
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID of the user
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique key to ensure idempotent payments
 *     responses:
 *       200:
 *         description: Payment successful
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Job not found or access denied
 */
router.post('/jobs/:job_id/pay', financialLimiter, getProfile, idempotency, payJob);

module.exports = router;
