const express = require('express');
const router = express.Router();
const { getContractById, getContracts } = require('../controllers/contractController');
const { getProfile } = require('../middleware/getProfile');

/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Get a contract by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID of the user
 *     responses:
 *       200:
 *         description: Contract found
 *       404:
 *         description: Contract not found or access denied
 *       401:
 *         description: Unauthorized
 */
router.get('/contracts/:id', getProfile, getContractById);

/**
 * @swagger
 * /contracts:
 *   get:
 *     summary: Get all contracts for the authenticated user
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID of the user
 *     responses:
 *       200:
 *         description: List of contracts
 *       401:
 *         description: Unauthorized
 */
router.get('/contracts', getProfile, getContracts);

module.exports = router;
