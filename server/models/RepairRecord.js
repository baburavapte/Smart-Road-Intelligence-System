const mongoose = require('mongoose');

const repairRecordSchema = new mongoose.Schema({
    citizenReportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CitizenReport'
    },
    detectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Detection'
    },
    roadHealthId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoadHealth'
    },
    beforeImage: {
        type: String,
        default: ''
    },
    afterImage: {
        type: String,
        default: ''
    },
    repairDate: {
        type: Date,
        default: Date.now
    },
    repairNotes: {
        type: String,
        default: ''
    },
    repairTeam: {
        type: String,
        default: ''
    },
    verifiedByCitizen: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

repairRecordSchema.index({ citizenReportId: 1 });
repairRecordSchema.index({ detectionId: 1 });

module.exports = mongoose.model('RepairRecord', repairRecordSchema);
