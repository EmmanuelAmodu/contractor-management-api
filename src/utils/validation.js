const Joi = require('joi');

const depositSchema = Joi.object({
    amount: Joi.number().positive().required(),
});

module.exports = { depositSchema };
