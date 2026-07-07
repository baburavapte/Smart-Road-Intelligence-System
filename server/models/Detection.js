const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true,
        unique: true
    },
    originalImage: {
        type: String,
        required: true
    },
    annotatedImage: {
        type: String,
        required: true
    },
    originalFilename: {
        type: String,
        default: 'unknown'
    },
    imageDimensions: {
        width: Number,
        height: Number
    },
    potholeCount: {
        type: Number,
        default: 0
    },
    detections: [{
        bbox: {
            x1: Number,
            y1: Number,
            x2: Number,
            y2: Number
        },
        confidence: Number,
        classId: Number,
        className: String
    }],
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'completed'
    },
    severity: {
        type: String,
        enum: ['none', 'low', 'medium', 'high', 'critical'],
        default: 'none'
    },
    reportStatus: {
        type: String,
        enum: ['reported', 'under_review', 'in_progress', 'fixed'],
        default: 'reported'
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number]  // [longitude, latitude]
        }
    }
}, {
    timestamps: true
});

// Pre-save hook to calculate severity based on pothole count
detectionSchema.pre('save', function (next) {
    if (this.potholeCount === 0) this.severity = 'none';
    else if (this.potholeCount <= 2) this.severity = 'low';
    else if (this.potholeCount <= 5) this.severity = 'medium';
    else if (this.potholeCount <= 10) this.severity = 'high';
    else this.severity = 'critical';
    next();
});

detectionSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Detection', detectionSchema);
