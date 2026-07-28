/**
 * Contractor Model — RoadSense AI
 * Represents road repair contractors with performance metrics and location.
 */

const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  specialization: {
    type: String,
    enum: ['Asphalt Repair', 'Road Marking', 'Drainage', 'Full Road', 'General Repair', 'Quick Patching', 'Concrete Repair', 'Resurfacing', 'Emergency Repairs'],
    default: 'General Repair'
  },
  activeJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RepairRecord'
  }],
  completedCount: {
    type: Number,
    default: 0
  },
  totalJobsAssigned: {
    type: Number,
    default: 0
  },
  avgResolutionDays: {
    type: Number,
    default: 0
  },
  onTimeRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [73.1812, 22.3072] // Default: Vadodara center [lng, lat]
    }
  },
  zone: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geospatial index for location queries
contractorSchema.index({ location: '2dsphere' });
contractorSchema.index({ zone: 1 });

module.exports = mongoose.model('Contractor', contractorSchema);
