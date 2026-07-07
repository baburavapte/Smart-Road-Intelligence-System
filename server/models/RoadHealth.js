const mongoose = require('mongoose');

const roadHealthSchema = new mongoose.Schema({
    roadName: {
        type: String,
        required: true,
        unique: true
    },
    healthScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    healthCategory: {
        type: String,
        enum: ['healthy', 'medium_risk', 'poor', 'critical'],
        default: 'healthy'
    },
    totalPotholes: {
        type: Number,
        default: 0
    },
    avgSeverityWeight: {
        type: Number,
        default: 0
    },
    lastCalculated: {
        type: Date,
        default: Date.now
    },
    history: [{
        score: Number,
        calculatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    boundingBox: {
        minLat: Number,
        maxLat: Number,
        minLng: Number,
        maxLng: Number
    },
    centerCoordinates: {
        type: [Number] // [lng, lat]
    }
}, {
    timestamps: true
});

// Pre-save hook to calculate health category from score
roadHealthSchema.pre('save', function (next) {
    if (this.healthScore >= 76) this.healthCategory = 'healthy';
    else if (this.healthScore >= 51) this.healthCategory = 'medium_risk';
    else if (this.healthScore >= 26) this.healthCategory = 'poor';
    else this.healthCategory = 'critical';
    next();
});

module.exports = mongoose.model('RoadHealth', roadHealthSchema);
