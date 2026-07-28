const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actionType: {
        type: String,
        required: true
    },
    targetResource: {
        type: String,
        default: ''
    },
    targetResourceId: {
        type: String,
        default: ''
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    actorName: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    changesDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
