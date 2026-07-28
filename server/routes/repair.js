const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const RepairRecord = require('../models/RepairRecord');
const CitizenReport = require('../models/CitizenReport');
const RoadHealth = require('../models/RoadHealth');
const authenticate = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/bmp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and BMP are allowed.'));
        }
    }
});

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

/**
 * POST /api/repair
 * Upload repair proof (before & after images + metadata)
 */
router.post('/', authenticate, upload.fields([
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { citizenReportId, detectionId, roadHealthId, repairNotes, repairTeam } = req.body;

        if (!req.files || !req.files['afterImage']) {
            return res.status(400).json({ error: 'After image is required as repair proof.' });
        }

        const afterImagePath = req.files['afterImage'][0].filename;
        const beforeImagePath = req.files['beforeImage'] ? req.files['beforeImage'][0].filename : '';

        // If citizenReportId is provided, let's update its lifecycle to 'fixed' or 'closed'
        if (citizenReportId) {
            const report = await CitizenReport.findById(citizenReportId);
            if (report) {
                report.reportLifecycle = 'fixed';
                report.fixedAt = new Date();
                if (repairTeam) report.assignedTeam = repairTeam;
                await report.save();
            }
        }

        const repairRecord = await RepairRecord.create({
            citizenReportId: citizenReportId || null,
            detectionId: detectionId || null,
            roadHealthId: roadHealthId || null,
            beforeImage: beforeImagePath,
            afterImage: afterImagePath,
            repairDate: new Date(),
            repairNotes: repairNotes || '',
            repairTeam: repairTeam || 'Municipal Team',
            verifiedByCitizen: false
        });

        res.status(201).json({ success: true, repairRecord });
    } catch (error) {
        console.error('Create repair record error:', error.message);
        res.status(500).json({ error: 'Failed to upload repair proof' });
    }
});

/**
 * GET /api/repair
 * Get all repair records
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const records = await RepairRecord.find()
            .sort({ createdAt: -1 })
            .populate({
                path: 'citizenReportId',
                select: 'reporterName description reportLifecycle'
            })
            .lean();

        const formatted = records.map(r => ({
            id: r._id,
            citizenReportId: r.citizenReportId,
            detectionId: r.detectionId,
            roadHealthId: r.roadHealthId,
            beforeImage: r.beforeImage ? `${FLASK_URL}/uploads/${r.beforeImage}` : null,
            afterImage: `${FLASK_URL}/uploads/${r.afterImage}`,
            repairDate: r.repairDate,
            repairNotes: r.repairNotes,
            repairTeam: r.repairTeam,
            verifiedByCitizen: r.verifiedByCitizen,
            createdAt: r.createdAt
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch repair records error:', error.message);
        res.status(500).json({ error: 'Failed to fetch repair records' });
    }
});

/**
 * GET /api/repair/by-report/:reportId
 * Get repair record by citizen report ID
 */
router.get('/by-report/:reportId', authenticate, async (req, res) => {
    try {
        const record = await RepairRecord.findOne({ citizenReportId: req.params.reportId }).lean();
        if (!record) {
            return res.status(404).json({ error: 'Repair record not found for this report' });
        }

        const formatted = {
            id: record._id,
            citizenReportId: record.citizenReportId,
            detectionId: record.detectionId,
            roadHealthId: record.roadHealthId,
            beforeImage: record.beforeImage ? `${FLASK_URL}/uploads/${record.beforeImage}` : null,
            afterImage: `${FLASK_URL}/uploads/${record.afterImage}`,
            repairDate: record.repairDate,
            repairNotes: record.repairNotes,
            repairTeam: record.repairTeam,
            verifiedByCitizen: record.verifiedByCitizen,
            createdAt: record.createdAt
        };

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch repair by report error:', error.message);
        res.status(500).json({ error: 'Failed to fetch repair record' });
    }
});

/**
 * PATCH /api/repair/:id/verify
 * Citizen verifies the repair
 */
router.patch('/:id/verify', async (req, res) => {
    try {
        const { verified } = req.body;
        const record = await RepairRecord.findByIdAndUpdate(
            req.params.id,
            { verifiedByCitizen: !!verified },
            { new: true }
        );

        if (!record) {
            return res.status(404).json({ error: 'Repair record not found' });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        console.error('Verify repair error:', error.message);
        res.status(500).json({ error: 'Failed to update verification status' });
    }
});

module.exports = router;
