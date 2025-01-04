const { Job, Contract, Profile, sequelize } = require('../models/model');
const { Op, col, fn, literal } = require('sequelize');
const Joi = require('joi');

const bestProfessionSchema = Joi.object({
  start: Joi.date().iso().required(),
  end: Joi.date().iso().required(),
});

const bestClientsSchema = Joi.object({
  start: Joi.date().iso().required(),
  end: Joi.date().iso().required(),
  limit: Joi.number().integer().min(1).default(2),
});

const getBestProfession = async (req, res) => {
  const { start, end } = req.query;

  const { error } = bestProfessionSchema.validate({ start, end });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const bestProfession = await Job.findAll({
      attributes: [
        [col('Contract.Contractor.profession'), 'profession'],
        [fn('SUM', col('price')), 'total_earned'],
      ],
      where: {
        paid: true,
        paymentDate: { [Op.between]: [new Date(start), new Date(end)] },
      },
      include: {
        model: Contract,
        include: {
          model: Profile,
          as: 'Contractor',
          attributes: [],
        },
      },
      group: ['profession'],
      order: [[fn('SUM', col('price')), 'DESC']],
      limit: 1,
    });

    if (bestProfession.length === 0) return res.status(404).json({ error: 'No professions found' });

    res.json(bestProfession[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getBestClients = async (req, res) => {
  const { start, end, limit } = req.query;

  const { error, value } = bestClientsSchema.validate({ start, end, limit });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const bestClients = await Job.findAll({
      attributes: [
        'Contract.Client.id',
        [literal(`Client.firstName || ' ' || Client.lastName`), 'fullName'],
        [fn('SUM', col('price')), 'total_paid'], // Renamed alias
      ],
      where: {
        paid: true,
        paymentDate: { [Op.between]: [new Date(start), new Date(end)] },
      },
      include: {
        model: Contract,
        include: {
          model: Profile,
          as: 'Client',
          attributes: [],
        },
      },
      group: ['Contract.Client.id'],
      order: [[fn('SUM', col('price')), 'DESC']],
      limit: Number.parseInt(value.limit),
    });

    res.json(bestClients);
  } catch (err) {
    console.error('Error in getBestClients:', err); // Log the actual error
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getBestProfession, getBestClients };
