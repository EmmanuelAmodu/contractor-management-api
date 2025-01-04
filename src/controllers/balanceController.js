const { Profile, Job, Contract, sequelize } = require('../models/model');
const { Op } = require('sequelize');
const { depositSchema } = require('../utils/validation');

const depositBalance = async (req, res) => {
    const { userId } = req.params;
    const { error, value } = depositSchema.validate(req.body);

    if (error) return res.status(400).json({ error: error.details[0].message });

    const { amount } = value;

    if (!amount || Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const client = await Profile.findOne({ where: { id: userId, type: 'client' } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Calculate total jobs to pay
    const totalJobsToPay = await Job.sum('price', {
        where: { paid: false },
        include: {
            model: Contract,
            where: { ClientId: userId, status: 'in_progress' },
        },
    }) || 0;

    if (amount > totalJobsToPay * 0.25) {
        return res.status(400).json({ error: 'Deposit amount exceeds 25% of total jobs to pay' });
    }

    client.balance += Number.parseFloat(amount);
    await client.save();

    res.json({ message: 'Deposit successful', balance: client.balance });
};

module.exports = { depositBalance };