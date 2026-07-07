const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientEmail: {
        type: String,
        required: true
    },
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CitizenReport'
    },
    type: {
        type: String,
        enum: [
            'report_submitted',
            'report_verified',
            'team_assigned',
            'repair_started',
            'repair_completed',
            'report_closed'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

notificationSchema.index({ recipientEmail: 1, read: 1 });
notificationSchema.index({ reportId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
