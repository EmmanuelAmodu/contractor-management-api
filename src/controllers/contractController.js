const { Contract } = require('../models/model');

const getContractById = async (req, res) => {
    const { Contract } = req.app.get('models');
    const { id } = req.params;
    const profileId = req.profile.id;

    const contract = await Contract.findOne({
        where: { id, [Contract.sequelize.Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }] },
    });

    if (!contract) return res.status(404).json({ error: 'Contract not found or access denied' });
    res.json(contract);
};

const getContracts = async (req, res) => {
  const { Contract } = req.app.get('models');
  const profileId = req.profile.id;
  const { page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;
  const contracts = await Contract.findAll({
      where: {
          [Contract.sequelize.Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
          status: { [Contract.sequelize.Op.ne]: 'terminated' },
      },
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
  });

  res.json(contracts);
};

module.exports = { getContractById, getContracts };
