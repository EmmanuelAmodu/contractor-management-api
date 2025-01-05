const { Op, Transaction } = require("sequelize");
const { depositSchema } = require("../utils/validation");
const { Profile, Job, Contract, sequelize } = require("../models/model");
const logger = require("../utils/logger");

const depositBalance = async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  // Validate input using depositSchema
  const { error } = depositSchema.validate({ amount });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  // Start a transaction with SERIALIZABLE isolation level
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // Fetch and lock the client row
    const client = await Profile.findOne({
      where: { id: userId, type: "client" },
      transaction: t,
      lock: "UPDATE", // Use string literal
    });

    if (!client) {
      await t.rollback();
      return res.status(404).json({ error: "Client not found" });
    }

    // Calculate total unpaid jobs within the transaction
    const totalJobsToPay =
      (await Job.sum("price", {
        where: { paid: false },
        include: {
          model: Contract,
          where: { ClientId: userId, status: "in_progress" },
        },
        transaction: t,
        lock: "SHARE", // Use string literal
      })) || 0;

    const depositLimit = totalJobsToPay * 0.25;

    if (amount > depositLimit) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Deposit amount exceeds 25% of total jobs to pay" });
    }

    // Update client balance
    client.balance =
      Number.parseFloat(client.balance) + Number.parseFloat(amount);
    await client.save({ transaction: t });

    // Commit the transaction
    await t.commit();

    // Log the successful deposit
    logger.info(
      `Deposit successful: Client ID ${client.id} deposited amount ${amount}. New balance: ${client.balance}`
    );

    res.json({ message: "Deposit successful", balance: client.balance });
  } catch (error) {
    // Rollback the transaction on error
    await t.rollback();
    logger.error(
      `Deposit failed: Client ID ${userId}. Error: ${error.message}`
    );
    res.status(500).json({ error: "Deposit failed", details: error.message });
  }
};

module.exports = { depositBalance };
