/**
 * User Management Routes — RoadSense AI
 * Admin-only endpoints for managing user roles and access.
 *
 * - GET  /api/users          — List all users (admin only)
 * - PUT  /api/users/:id/role — Change a user's role (admin only)
 * - PUT  /api/users/:id/active — Activate/deactivate a user (admin only)
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, requireRole } = require('./auth');

// All routes require admin authentication
router.use(authMiddleware);
router.use(requireRole('admin'));

/**
 * GET /api/users
 * List all users with optional filters.
 * Query params: ?role=citizen|officer|admin&search=text&page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role && ['citizen', 'officer', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List users error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/users/:id/role
 * Change a user's role.
 * Body: { role: 'citizen' | 'officer' | 'admin' }
 */
router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['citizen', 'officer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be citizen, officer, or admin' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent admin from demoting themselves
    if (user._id.toString() === req.user.userId && role !== 'admin') {
      return res.status(400).json({ success: false, error: 'You cannot change your own role' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `User role changed from ${previousRole} to ${role}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user role error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

/**
 * PUT /api/users/:id/active
 * Activate or deactivate a user.
 * Body: { isActive: true | false }
 */
router.put('/:id/active', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive must be a boolean' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.userId && !isActive) {
      return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user active status error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

module.exports = router;
