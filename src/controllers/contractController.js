const { Contract } = require("../models/model");
const { Op } = require("sequelize");

const getContractById = async (req, res) => {
  const { Contract } = req.app.get("models");
  const { id } = req.params;
  const profileId = req.profile.id;

  const contract = await Contract.findOne({
    where: {
      id,
      [Op.or]: [
        { ClientId: profileId },
        { ContractorId: profileId },
      ],
    },
  });

  if (!contract)
    return res
      .status(404)
      .json({ error: "Contract not found or access denied" });
  res.json(contract);
};

const getContracts = async (req, res, next) => {
  const profileId = req.profile.id;
  const { status } = req.query;
  const limit = req.query.limit || 10; // Default limit

  try {
    const whereClause = {
      [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
    };

    if (status === "terminated") {
      whereClause.status = "terminated";
    } else {
      whereClause.status = { [Op.ne]: "terminated" };
    }

    const contracts = await Contract.findAll({
      where: whereClause,
      limit: Number.parseInt(limit),
    });

    res.json(contracts);
  } catch (error) {
    next(error);
  }
};

module.exports = { getContractById, getContracts };
