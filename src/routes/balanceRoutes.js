const express = require('express');
const router = express.Router();
const { depositBalance } = require('../controllers/balanceController');
const { getProfile } = require('../middleware/getProfile');

/**
 * @swagger
 * tags:
 *   name: Balances
 *   description: Operations related to user balances
 */

/**
 * @swagger
 * /balances/deposit/{userId}:
 *   post:
 *     summary: Deposit money into a client's balance
 *     tags: [Balances]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user (client) to deposit into
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID of the authenticated user making the deposit
 *     requestBody:
 *       required: true
 *       description: Amount to deposit into the client's balance
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: double
 *                 description: The amount of money to deposit
 *                 example: 500.00
 *     responses:
 *       200:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Deposit successful"
 *                 balance:
 *                   type: number
 *                   format: double
 *                   description: Updated balance of the client
 *                   example: 1500.00
 *       400:
 *         description: Bad Request - Invalid input or deposit exceeds allowed limit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Deposit amount exceeds 25% of total jobs to pay"
 *       401:
 *         description: Unauthorized - Missing or invalid profile_id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing or invalid profile_id"
 *       404:
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Client not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Deposit failed"
 */
router.post('/balances/deposit/:userId', getProfile, depositBalance);

module.exports = router;
