const express = require('express');
const router = express.Router();
const { getUnpaidJobs, payJob } = require('../controllers/jobController');
const { getProfile } = require('../middleware/getProfile');

router.get('/jobs/unpaid', getProfile, getUnpaidJobs);
router.post('/jobs/:job_id/pay', getProfile, payJob);

module.exports = router;
