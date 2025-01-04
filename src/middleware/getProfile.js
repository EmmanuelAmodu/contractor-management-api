const { Profile, Contract } = require('../models/model');

const getProfile = async (req, res, next) => {
    const profileId = req.get('profile_id');
    if (!profileId) return res.status(401).json({ error: 'Missing profile_id header' });

    const profile = await Profile.findOne({ where: { id: profileId } });
    if (!profile) return res.status(401).json({ error: 'Profile not found' });

    req.profile = profile;
    next();
};

const isContractorOrClient = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.profile.type)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

module.exports = { getProfile, isContractorOrClient };
