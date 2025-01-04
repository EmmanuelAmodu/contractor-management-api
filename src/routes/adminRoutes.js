const express = require('express');
const router = express.Router();
const { getBestProfession, getBestClients } = require('../controllers/adminController');
const { getProfile } = require('../middleware/getProfile');
const { isContractorOrClient } = require('../middleware/getProfile');

router.get('/admin/best-profession', getProfile, getBestProfession);
router.get('/admin/best-clients', getProfile, getBestClients);

module.exports = router;
