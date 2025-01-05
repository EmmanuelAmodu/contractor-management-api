const {
  Job,
  Contract,
  Profile,
  IdempotencyKey,
  sequelize,
} = require("../models/model");
const logger = require("../utils/logger");
const { Op, Transaction } = require("sequelize");

const getUnpaidJobs = async (req, res) => {
  try {
    const profileId = req.profile.id;

    const jobs = await Job.findAll({
      where: { paid: false },
      include: {
        model: Contract,
        where: {
          [Contract.sequelize.Op.or]: [
            { ClientId: profileId },
            { ContractorId: profileId },
          ],
          status: "in_progress",
        },
      },
    });

    res.json(jobs);
  } catch (error) {
    logger.error(`Error fetching unpaid jobs: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const payJob = async (req, res) => {
  const { job_id } = req.params;
  const profileId = req.profile.id;
  const idempotencyKey = req.idempotencyKey;

  // Start a transaction with SERIALIZABLE isolation level
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // Check if idempotency key exists
    const existingKey = await IdempotencyKey.findOne({
      where: { key: idempotencyKey },
      transaction: t,
    });
    if (existingKey) {
      await t.rollback();
      return res.status(200).json(existingKey.response);
    }

    // Fetch and lock the job row
    const job = await Job.findOne({
      where: { id: job_id },
      include: {
        model: Contract,
        where: { ClientId: profileId },
        include: { model: Profile, as: "Contractor" },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!job) {
      await t.rollback();
      return res.status(404).json({ error: "Job not found or access denied" });
    }

    if (job.paid) {
      await t.rollback();
      return res.status(400).json({ error: "Job is already paid" });
    }

    // Fetch and lock the client row
    const client = await Profile.findOne({
      where: { id: profileId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!client) {
      await t.rollback();
      return res.status(404).json({ error: "Client not found" });
    }

    if (client.balance < job.price) {
      await t.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Fetch and lock the contractor row
    const contractor = await Profile.findOne({
      where: { id: job.Contract.Contractor.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!contractor) {
      await t.rollback();
      return res.status(404).json({ error: "Contractor not found" });
    }

    // Update balances and job status
    client.balance =
      Number.parseFloat(client.balance) - Number.parseFloat(job.price);
    contractor.balance =
      Number.parseFloat(contractor.balance) + Number.parseFloat(job.price);
    job.paid = true;
    job.paymentDate = new Date();

    // Save updates within the transaction
    await client.save({ transaction: t });
    await contractor.save({ transaction: t });
    await job.save({ transaction: t });

    // Store the idempotency key and response
    await IdempotencyKey.create(
      {
        key: idempotencyKey,
        response: { message: "Payment successful", job },
      },
      { transaction: t }
    );

    // Commit the transaction
    await t.commit();

    // Log the successful payment
    logger.info(
      `Payment successful: Job ID ${job.id} paid by Client ID ${client.id} to Contractor ID ${contractor.id} for amount ${job.price}`
    );

    res.json({ message: "Payment successful", job });
  } catch (error) {
    // Rollback the transaction on error
    await t.rollback();
    logger.error(
      `Payment failed: Job ID ${job_id} by Client ID ${profileId}. Error: ${error.message}`
    );
    res.status(500).json({ error: "Payment failed", details: error.message });
  }
};

module.exports = { getUnpaidJobs, payJob };
