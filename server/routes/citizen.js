const express = require('express');
const router = express.Router();
const CitizenReport = require('../models/CitizenReport');
const Detection = require('../models/Detection');
const Notification = require('../models/Notification');
const notifications = require('../services/notifications');

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

// Helper: create a notification when lifecycle changes
async function createNotification(report, type, title, message) {
    if (!report.reporterEmail) return;
    try {
        await Notification.create({
            recipientEmail: report.reporterEmail,
            reportId: report._id,
            type,
            title,
            message
        });
    } catch (err) {
        console.error('Notification creation error:', err.message);
    }
}

/**
 * POST /api/citizen/reports
 * Create a citizen report linked to a detection
 */
router.post('/reports', async (req, res) => {
    try {
        const { detectionId, reporterName, reporterEmail, reporterPhone, description } = req.body;

        if (!detectionId) {
            return res.status(400).json({ error: 'detectionId is required' });
        }

        const detection = await Detection.findById(detectionId);
        if (!detection) {
            return res.status(404).json({ error: 'Detection not found' });
        }

        const report = await CitizenReport.create({
            detectionId,
            reporterName: reporterName || 'Anonymous',
            reporterEmail: reporterEmail || '',
            reporterPhone: reporterPhone || '',
            description: description || ''
        });

        // Create notification database entry
        await createNotification(report, 'report_submitted',
            'Report Submitted',
            `Your pothole report has been submitted successfully. Report ID: ${report._id}`
        );

        if (global.io) {
            global.io.to('role-admin').to('role-officer').emit('notification', {
                type: 'new_report',
                title: 'New Citizen Report',
                message: `New report submitted on ${detection.originalFilename || 'road'}. Severity: ${detection.severity}`,
                reportId: report._id,
                email: report.reporterEmail
            });
            if (report.reporterEmail) {
                global.io.to(report.reporterEmail).emit('notification', {
                    type: 'report_submitted',
                    title: 'Report Submitted',
                    message: `Your report has been received. ID: ${report._id.toString().substring(0,8)}`,
                    reportId: report._id
                });
            }
        }

        // Send email to citizen
        if (report.reporterEmail) {
            await notifications.sendEmail(report.reporterEmail, 'reportSubmitted', report);
        }

        res.status(201).json({ success: true, report });
    } catch (error) {
        console.error('Create citizen report error:', error.message);
        res.status(500).json({ error: 'Failed to create citizen report' });
    }
});

/**
 * GET /api/citizen/reports
 * Get all citizen reports (optional: filter by email for citizen view)
 */
router.get('/reports', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};

        if (req.query.email) filter.reporterEmail = req.query.email;
        if (req.query.lifecycle) filter.reportLifecycle = req.query.lifecycle;
        if (req.query.status) {
            if (req.query.status === 'open') {
                filter.reportLifecycle = { $nin: ['closed', 'fixed'] };
            } else {
                filter.reportLifecycle = req.query.status;
            }
        }
        if (req.query.contractor) filter.assignedTeam = req.query.contractor;

        if (req.query.dateFrom || req.query.dateTo) {
            filter.createdAt = {};
            if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
        }

        // Geospatial zone filter
        if (req.query.zone) {
            const zonesConfig = require('../config/zones');
            const zoneObj = zonesConfig.find(z => z.name === req.query.zone);
            if (zoneObj && zoneObj.boundary) {
                const matchingDetections = await Detection.find({
                    location: {
                        $geoWithin: {
                            $geometry: zoneObj.boundary
                        }
                    }
                }).select('_id').lean();
                
                const detectionIds = matchingDetections.map(d => d._id);
                filter.detectionId = { $in: detectionIds };
            }
        }

        // Severity filter
        if (req.query.severity) {
            const matchingDetections = await Detection.find({
                severity: req.query.severity
            }).select('_id').lean();
            
            const detectionIds = matchingDetections.map(d => d._id);
            if (filter.detectionId) {
                const currentIds = filter.detectionId.$in || [];
                filter.detectionId = { $in: currentIds.filter(id => detectionIds.some(m => m.toString() === id.toString())) };
            } else {
                filter.detectionId = { $in: detectionIds };
            }
        }

        // Search filter (on filename/road name)
        if (req.query.search) {
            const matchingDetections = await Detection.find({
                originalFilename: { $regex: req.query.search, $options: 'i' }
            }).select('_id').lean();
            
            const detectionIds = matchingDetections.map(d => d._id);
            if (filter.detectionId) {
                const currentIds = filter.detectionId.$in || [];
                filter.detectionId = { $in: currentIds.filter(id => detectionIds.some(m => m.toString() === id.toString())) };
            } else {
                filter.detectionId = { $in: detectionIds };
            }
        }

        const total = await CitizenReport.countDocuments(filter);
        const reports = await CitizenReport.find(filter)
            .populate({
                path: 'detectionId',
                select: 'originalImage annotatedImage potholeCount severity location originalFilename createdAt'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const formatted = reports.map(r => ({
            id: r._id,
            reporterName: r.reporterName,
            reporterEmail: r.reporterEmail,
            reporterPhone: r.reporterPhone,
            description: r.description,
            reportLifecycle: r.reportLifecycle,
            assignedTeam: r.assignedTeam,
            priorityScore: r.priorityScore,
            verifiedAt: r.verifiedAt,
            assignedAt: r.assignedAt,
            fixedAt: r.fixedAt,
            closedAt: r.closedAt,
            createdAt: r.createdAt,
            detection: r.detectionId ? {
                id: r.detectionId._id,
                originalImage: `${FLASK_URL}/uploads/${r.detectionId.originalImage}`,
                annotatedImage: `${FLASK_URL}/results/${r.detectionId.annotatedImage}`,
                potholeCount: r.detectionId.potholeCount,
                severity: r.detectionId.severity,
                location: r.detectionId.location,
                originalFilename: r.detectionId.originalFilename,
                createdAt: r.detectionId.createdAt
            } : null
        }));

        res.json({
            success: true,
            data: formatted,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Fetch citizen reports error:', error.message);
        res.status(500).json({ error: 'Failed to fetch citizen reports' });
    }
});

/**
 * GET /api/citizen/reports/stats
 * Get lifecycle stats for government dashboard
 */
router.get('/reports/stats', async (req, res) => {
    try {
        const total = await CitizenReport.countDocuments();
        const lifecycleCounts = await CitizenReport.aggregate([
            { $group: { _id: '$reportLifecycle', count: { $sum: 1 } } }
        ]);

        const stats = {
            total,
            reported: 0, verified: 0, assigned: 0,
            in_progress: 0, fixed: 0, closed: 0
        };
        lifecycleCounts.forEach(lc => {
            if (lc._id) stats[lc._id] = lc.count;
        });

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Citizen stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch citizen report stats' });
    }
});

/**
 * GET /api/citizen/reports/:id
 * Get a single citizen report with full lifecycle details
 */
router.get('/reports/:id', async (req, res) => {
    try {
        const report = await CitizenReport.findById(req.params.id)
            .populate({
                path: 'detectionId',
                select: 'originalImage annotatedImage potholeCount severity location originalFilename imageDimensions detections createdAt'
            })
            .lean();

        if (!report) {
            return res.status(404).json({ error: 'Citizen report not found' });
        }

        const formatted = {
            id: report._id,
            reporterName: report.reporterName,
            reporterEmail: report.reporterEmail,
            reporterPhone: report.reporterPhone,
            description: report.description,
            reportLifecycle: report.reportLifecycle,
            assignedTeam: report.assignedTeam,
            priorityScore: report.priorityScore,
            verifiedAt: report.verifiedAt,
            assignedAt: report.assignedAt,
            fixedAt: report.fixedAt,
            closedAt: report.closedAt,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            detection: report.detectionId ? {
                id: report.detectionId._id,
                originalImage: `${FLASK_URL}/uploads/${report.detectionId.originalImage}`,
                annotatedImage: `${FLASK_URL}/results/${report.detectionId.annotatedImage}`,
                potholeCount: report.detectionId.potholeCount,
                severity: report.detectionId.severity,
                location: report.detectionId.location,
                originalFilename: report.detectionId.originalFilename,
                createdAt: report.detectionId.createdAt
            } : null
        };

        res.json({ success: true, report: formatted });
    } catch (error) {
        console.error('Fetch single citizen report error:', error.message);
        res.status(500).json({ error: 'Failed to fetch citizen report' });
    }
});

/**
 * PATCH /api/citizen/reports/:id/lifecycle
 * Update lifecycle stage (government action)
 */
router.patch('/reports/:id/lifecycle', async (req, res) => {
    try {
        const { lifecycle, assignedTeam } = req.body;
        const validLifecycles = ['reported', 'verified', 'assigned', 'in_progress', 'fixed', 'closed'];

        if (!lifecycle || !validLifecycles.includes(lifecycle)) {
            return res.status(400).json({
                error: `Invalid lifecycle. Must be one of: ${validLifecycles.join(', ')}`
            });
        }

        const update = { reportLifecycle: lifecycle };

        // Set timestamps for lifecycle stages
        if (lifecycle === 'verified') update.verifiedAt = new Date();
        if (lifecycle === 'assigned') {
            update.assignedAt = new Date();
            if (assignedTeam) update.assignedTeam = assignedTeam;
        }
        if (lifecycle === 'fixed') update.fixedAt = new Date();
        if (lifecycle === 'closed') update.closedAt = new Date();

        const report = await CitizenReport.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        );

        if (!report) {
            return res.status(404).json({ error: 'Citizen report not found' });
        }

        // Create notification based on lifecycle change
        const notificationMap = {
            verified: { type: 'report_verified', title: 'Report Verified', msg: 'Your pothole report has been verified by authorities.' },
            assigned: { type: 'team_assigned', title: 'Team Assigned', msg: `A repair team (${report.assignedTeam || 'TBD'}) has been assigned to your report.` },
            in_progress: { type: 'repair_started', title: 'Repair Started', msg: 'Repair work has begun on the pothole you reported.' },
            fixed: { type: 'repair_completed', title: 'Repair Completed', msg: 'The pothole has been repaired! Thank you for your report.' },
            closed: { type: 'report_closed', title: 'Report Closed', msg: 'Your pothole report has been closed.' }
        };

        if (notificationMap[lifecycle]) {
            const n = notificationMap[lifecycle];
            await createNotification(report, n.type, n.title, n.msg);

            if (global.io) {
                if (report.reporterEmail) {
                    global.io.to(report.reporterEmail).emit('notification', {
                        type: n.type,
                        title: n.title,
                        message: n.msg,
                        reportId: report._id,
                        lifecycle
                    });
                }
                global.io.to('role-admin').to('role-officer').emit('notification', {
                    type: 'status_updated',
                    title: 'Report Status Updated',
                    message: `Report ID #${report._id.toString().substring(0,6)} updated to: ${lifecycle}`,
                    reportId: report._id,
                    lifecycle
                });
            }
        }

        res.json({
            success: true,
            report: { id: report._id, reportLifecycle: report.reportLifecycle }
        });
    } catch (error) {
        console.error('Lifecycle update error:', error.message);
        res.status(500).json({ error: 'Failed to update lifecycle' });
    }
});

module.exports = router;
