const express = require('express');
const router = express.Router();
const { getContractById, getContracts } = require('../controllers/contractController');
const { getProfile } = require('../middleware/getProfile');

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Operations related to contracts
 */

/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Retrieve a specific contract by its ID
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the contract to retrieve
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The Profile ID of the authenticated user making the request
 *     responses:
 *       200:
 *         description: Successfully retrieved the contract
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contract'
 *             example:
 *               id: 1
 *               terms: "Provide advanced magic lessons."
 *               status: "terminated"
 *               ClientId: 2
 *               ContractorId: 5
 *               createdAt: "2023-01-01T00:00:00.000Z"
 *               updatedAt: "2023-01-10T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Missing or invalid authentication token"
 *       403:
 *         description: Forbidden - Access restricted to contracts associated with the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Forbidden: You do not have access to this contract"
 *       404:
 *         description: Not Found - Contract does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Contract not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "An unexpected error occurred"
 */
router.get('/contracts/:id', getProfile, getContractById);

/**
 * @swagger
 * /contracts:
 *   get:
 *     summary: Retrieve all non-terminated contracts for the authenticated user
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The Profile ID of the authenticated user making the request
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [new, in_progress, terminated]
 *         description: Filter contracts by status
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Maximum number of contracts to return
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contract'
 *             example:
 *               - id: 2
 *                 terms: "Develop secure hacking protocols."
 *                 status: "in_progress"
 *                 ClientId: 2
 *                 ContractorId: 6
 *                 createdAt: "2023-01-02T00:00:00.000Z"
 *                 updatedAt: "2023-01-11T00:00:00.000Z"
 *               - id: 3
 *                 terms: "Create open-source software solutions."
 *                 status: "in_progress"
 *                 ClientId: 3
 *                 ContractorId: 6
 *                 createdAt: "2023-01-03T00:00:00.000Z"
 *                 updatedAt: "2023-01-12T00:00:00.000Z"
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
router.get('/contracts', getProfile, getContracts);

module.exports = router;
