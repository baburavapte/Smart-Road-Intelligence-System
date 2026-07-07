const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Get notifications for a citizen (filtered by email)
 */
router.get('/', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        const notifications = await Notification.find({ recipientEmail: email })
            .sort({ createdAt: -1 })
            .lean();

        const formatted = notifications.map(n => ({
            id: n._id,
            recipientEmail: n.recipientEmail,
            reportId: n.reportId,
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch notifications error:', error.message);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for an email
 */
router.get('/unread-count', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        const count = await Notification.countDocuments({
            recipientEmail: email,
            read: false
        });

        res.json({ success: true, count });
    } catch (error) {
        console.error('Fetch unread count error:', error.message);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Mark notification read error:', error.message);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for an email
 */
router.patch('/read-all', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        await Notification.updateMany(
            { recipientEmail: email, read: false },
            { read: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error.message);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

module.exports = router;
