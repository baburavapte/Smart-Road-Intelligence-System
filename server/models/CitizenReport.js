const mongoose = require('mongoose');

const citizenReportSchema = new mongoose.Schema({
    detectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Detection',
        required: true
    },
    reporterName: {
        type: String,
        default: 'Anonymous'
    },
    reporterEmail: {
        type: String,
        default: ''
    },
    reporterPhone: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    reportLifecycle: {
        type: String,
        enum: ['reported', 'verified', 'assigned', 'in_progress', 'fixed', 'closed'],
        default: 'reported'
    },
    assignedTeam: {
        type: String,
        default: ''
    },
    verifiedAt: Date,
    assignedAt: Date,
    fixedAt: Date,
    closedAt: Date,
    priorityScore: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

citizenReportSchema.index({ reporterEmail: 1 });
citizenReportSchema.index({ reportLifecycle: 1 });
citizenReportSchema.index({ detectionId: 1 });

module.exports = mongoose.model('CitizenReport', citizenReportSchema);
