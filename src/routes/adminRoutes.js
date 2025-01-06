const express = require('express');
const router = express.Router();
const { getBestProfession, getBestClients } = require('../controllers/adminController');
const { getProfile } = require('../middleware/getProfile');
const authorizeAdmin = require('../middleware/authorizeAdmin');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations for managing professions and clients
 */

/**
 * @swagger
 * /admin/best-profession:
 *   get:
 *     summary: Retrieve the profession that earned the most within a specified date range
 *     tags: [Admin]
 *     security:
 *       - profileAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in YYYY-MM-DD format
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Successfully retrieved the best profession
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BestProfessionResponse'
 *             example:
 *               profession: "Wizard"
 *               total_earned: 1500.00
 *       400:
 *         description: Bad Request - Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Invalid date format for 'start'"
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Missing or invalid authentication token"
 *       403:
 *         description: Forbidden - Access restricted to admin users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Forbidden: Admins only"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "An unexpected error occurred"
 */
router.get('/admin/best-profession', getProfile, authorizeAdmin, getBestProfession);

/**
 * @swagger
 * /admin/best-clients:
 *   get:
 *     summary: Retrieve the top-paying clients within a specified date range
 *     tags: [Admin]
 *     security:
 *       - profileAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in YYYY-MM-DD format
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in YYYY-MM-DD format
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 2
 *           minimum: 1
 *         description: Number of top clients to return (default is 2)
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of best clients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BestClientResponse'
 *             example:
 *               - id: 1
 *                 fullName: "Reece Moyer"
 *                 paid: 100.3
 *               - id: 200
 *                 fullName: "Debora Martin"
 *                 paid: 99
 *       400:
 *         description: Bad Request - Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "End date must be after start date"
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Missing or invalid authentication token"
 *       403:
 *         description: Forbidden - Access restricted to admin users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Forbidden: Admins only"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "An unexpected error occurred"
 */
router.get('/admin/best-clients', getProfile, authorizeAdmin, getBestClients);

module.exports = router;
