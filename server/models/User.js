/**
 * User Model — Authentication & Authorization
 * SECURITY: Passwords stored as bcrypt hashes (cost factor 12).
 * No plaintext credentials anywhere in the codebase.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  officerId: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['citizen', 'officer', 'admin'],
    required: true
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  notificationPreferences: {
    emailOnStatusChange: { type: Boolean, default: true },
    emailOnRepairComplete: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false }
  },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for fast role-based lookups (email and officerId already indexed via unique: true)
userSchema.index({ role: 1 });

/**
 * Compare a candidate password against the stored hash.
 * @param {string} candidatePassword — plaintext from login form
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Hash a password before saving (static utility).
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
userSchema.statics.hashPassword = async function (plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
};

/**
 * Record a login event (keep last 5 entries).
 */
userSchema.methods.recordLogin = async function (ip, userAgent) {
  this.loginHistory.unshift({ timestamp: new Date(), ip, userAgent });
  if (this.loginHistory.length > 5) {
    this.loginHistory = this.loginHistory.slice(0, 5);
  }
  return this.save();
};

// Never return passwordHash in JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
