const { IdempotencyKey } = require('../models/model');

const idempotency = async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key) {
        return res.status(400).json({ error: 'Missing Idempotency-Key header' });
    }

    try {
        const existingKey = await IdempotencyKey.findOne({ where: { key } });
        if (existingKey) {
            return res.status(200).json(existingKey.response);
        }

        // Attach the key to the request for later use
        req.idempotencyKey = key;
        next();
    } catch (error) {
        console.error(`Idempotency check failed: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { idempotency };
