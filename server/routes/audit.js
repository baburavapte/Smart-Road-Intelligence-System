const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
        }

        const { search, actionType, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (actionType) {
            filter.actionType = actionType;
        }

        if (search) {
            filter.$or = [
                { actorName: { $regex: search, $options: 'i' } },
                { targetResourceId: { $regex: search, $options: 'i' } },
                { targetResource: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await AuditLog.countDocuments(filter);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Fetch audit logs error:', error.message);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;
