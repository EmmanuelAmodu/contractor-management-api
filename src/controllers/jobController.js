const { Job, Contract, Profile, sequelize } = require('../models/model');

const getUnpaidJobs = async (req, res) => {
    const profileId = req.profile.id;

    const jobs = await Job.findAll({
        where: { paid: false },
        include: {
            model: Contract,
            where: {
                [Contract.sequelize.Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
                status: 'in_progress',
            },
        },
    });

    res.json(jobs);
};

const payJob = async (req, res) => {
    const { job_id } = req.params;
    const profileId = req.profile.id;

    const job = await Job.findOne({
        where: { id: job_id },
        include: {
            model: Contract,
            where: { ClientId: profileId },
            include: { model: Profile, as: 'Contractor' },
        },
    });

    if (!job) return res.status(404).json({ error: 'Job not found or access denied' });
    if (job.paid) return res.status(400).json({ error: 'Job is already paid' });

    const client = req.profile;
    const contractor = job.Contract.Contractor;

    if (client.balance < job.price) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Transaction to ensure atomicity
    const t = await sequelize.transaction();
    try {
        client.balance -= job.price;
        contractor.balance += job.price;
        job.paid = true;
        job.paymentDate = new Date();

        await client.save({ transaction: t });
        await contractor.save({ transaction: t });
        await job.save({ transaction: t });

        await t.commit();
        res.json({ message: 'Payment successful', job });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: 'Payment failed', details: error.message });
    }
};

module.exports = { getUnpaidJobs, payJob };
