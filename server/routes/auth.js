const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// ── LOGIN ──────────────────────────────
router.post('/login', [
  body('role').isIn(['citizen', 'officer', 'admin']).withMessage('Role must be citizen, officer, or admin'),
  body('password').notEmpty().withMessage('Password is required'),
  body('email').if(body('role').isIn(['citizen', 'admin'])).isEmail().withMessage('Valid email format is required'),
  body('officerId').if(body('role').equals('officer')).notEmpty().withMessage('Officer ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array(), error: errors.array()[0].msg });
  }

  try {
    const { role, email, officerId, password } = req.body;

    // Find the user
    let user;
    if (role === 'citizen' || role === 'admin') {
      if (!email) return res.status(400).json({ error: 'Email is required' });
      user = await User.findOne({ email: email.toLowerCase() });
    } else if (role === 'officer') {
      if (!officerId) return res.status(400).json({ error: 'Officer ID is required' });
      user = await User.findOne({ officerId: officerId.toUpperCase() });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check user exists, is active, and password matches
    if (!user || !user.isActive ||
        !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Record login history
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';
    if (user.recordLogin) {
      await user.recordLogin(ip, userAgent).catch(() => {});
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email || null,
        officerId: user.officerId || null
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Officer + Admin → httpOnly cookie (JS cannot read it — more secure)
    if (role === 'officer' || role === 'admin') {
      res.cookie('roadsense_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
      });
      return res.json({
        success: true,
        token,
        role: user.role,
        user: { name: user.name, role: user.role, email: user.email || null, officerId: user.officerId || null }
      });
    }

    // Citizen → token in response body (stored in sessionStorage by Angular)
    res.cookie('roadsense_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({
      success: true,
      token,
      role: user.role,
      user: { name: user.name, role: user.role, email: user.email }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed — try again' });
  }
});

// ── REGISTER (Citizen) ──────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      passwordHash,
      role: 'citizen',
      phone: phone || '',
      isActive: true
    });

    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('roadsense_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json({
      success: true,
      token,
      role: 'citizen',
      user: { name: user.name, role: 'citizen', email: user.email }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during registration' });
  }
});

// ── RESTORE SESSION (called on page refresh) ──
router.get('/me', (req, res) => {
  const token =
    req.cookies?.roadsense_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, role: decoded.role, user: decoded });
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
});

// ── LOGOUT ────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('roadsense_token', { path: '/' });
  res.json({ success: true });
});

// Helper auth middleware
function authMiddleware(req, res, next) {
  const token =
    req.cookies?.roadsense_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;
