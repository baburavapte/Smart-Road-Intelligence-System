const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const Detection = require('../models/Detection');
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
 * POST /api/detect
 * Upload an image and run pothole detection
 */
router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Forward image to Flask inference service
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const flaskResponse = await axios.post(`${FLASK_URL}/detect`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000 // 60s timeout for inference
        });

        const result = flaskResponse.data;

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Detection failed' });
        }

        // Save detection to MongoDB
        const detection = new Detection({
            fileId: result.file_id,
            originalImage: result.original_image,
            annotatedImage: result.annotated_image,
            originalFilename: req.file.originalname,
            imageDimensions: result.image_dimensions,
            potholeCount: result.pothole_count,
            detections: result.detections.map(d => ({
                bbox: d.bbox,
                confidence: d.confidence,
                classId: d.class_id,
                className: d.class_name
            })),
            status: 'completed'
        });

        // Add location if coordinates provided
        if (req.body.latitude && req.body.longitude) {
            detection.location = {
                type: 'Point',
                coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
            };
        }

        await detection.save();

        // Clean up local upload (Flask has its own copy)
        fs.unlink(req.file.path, () => { });

        res.json({
            success: true,
            detection: {
                id: detection._id,
                fileId: detection.fileId,
                originalImage: `${FLASK_URL}/uploads/${detection.originalImage}`,
                annotatedImage: `${FLASK_URL}/results/${detection.annotatedImage}`,
                potholeCount: detection.potholeCount,
                severity: detection.severity,
                detections: detection.detections,
                imageDimensions: detection.imageDimensions,
                createdAt: detection.createdAt
            }
        });

    } catch (error) {
        console.error('========== DETECTION ERROR ==========');
        console.error('Message:', error.message);
        console.error('Status:', error.response?.status);
        console.error('Flask response:', error.response?.data);
        console.error('URL:', error.config?.url);
        console.error('====================================');

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'Inference service is not available.'
            });
        }

        res.status(500).json({
            success: false,
            error: error.response?.data || error.message || 'Internal server error'
        });
    }
});

/**
 * GET /api/detections
 * Get all past detections (paginated)
 */
router.get('/detections', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const total = await Detection.countDocuments();
        const detections = await Detection.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const formattedDetections = detections.map(d => ({
            id: d._id,
            fileId: d.fileId,
            originalImage: `${FLASK_URL}/uploads/${d.originalImage}`,
            annotatedImage: `${FLASK_URL}/results/${d.annotatedImage}`,
            originalFilename: d.originalFilename,
            potholeCount: d.potholeCount,
            severity: d.severity,
            detections: d.detections,
            imageDimensions: d.imageDimensions,
            createdAt: d.createdAt
        }));

        res.json({
            success: true,
            data: formattedDetections,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Fetch detections error:', error.message);
        res.status(500).json({ error: 'Failed to fetch detections' });
    }
});

/**
 * GET /api/detections/geojson
 * Get all geolocated detections as a GeoJSON FeatureCollection (for Leaflet map)
 */
router.get('/detections/geojson', async (req, res) => {
    try {
        const detections = await Detection.find({
            location: { $exists: true, $ne: null },
            'location.coordinates': { $exists: true }
        }).sort({ createdAt: -1 }).lean();

        const features = detections.map(d => ({
            type: 'Feature',
            geometry: d.location,
            properties: {
                id: d._id,
                fileId: d.fileId,
                severity: d.severity,
                potholeCount: d.potholeCount,
                originalFilename: d.originalFilename,
                annotatedImage: `${FLASK_URL}/results/${d.annotatedImage}`,
                createdAt: d.createdAt
            }
        }));

        res.json({
            type: 'FeatureCollection',
            features
        });
    } catch (error) {
        console.error('GeoJSON fetch error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/detections/:id
 * Get a single detection by ID
 */
router.get('/detections/:id', async (req, res) => {
    try {
        const detection = await Detection.findById(req.params.id).lean();
        if (!detection) {
            return res.status(404).json({ error: 'Detection not found' });
        }

        res.json({
            success: true,
            detection: {
                id: detection._id,
                fileId: detection.fileId,
                originalImage: `${FLASK_URL}/uploads/${detection.originalImage}`,
                annotatedImage: `${FLASK_URL}/results/${detection.annotatedImage}`,
                originalFilename: detection.originalFilename,
                potholeCount: detection.potholeCount,
                severity: detection.severity,
                detections: detection.detections,
                imageDimensions: detection.imageDimensions,
                createdAt: detection.createdAt
            }
        });

    } catch (error) {
        console.error('Fetch detection error:', error.message);
        res.status(500).json({ error: 'Failed to fetch detection' });
    }
});

/**
 * GET /api/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const totalDetections = await Detection.countDocuments();
        const totalPotholes = await Detection.aggregate([
            { $group: { _id: null, total: { $sum: '$potholeCount' } } }
        ]);

        const severityDistribution = await Detection.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const recentDetections = await Detection.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const avgPotholes = totalDetections > 0
            ? (totalPotholes[0]?.total || 0) / totalDetections
            : 0;

        // Detections over time (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyDetections = await Detection.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    potholes: { $sum: '$potholeCount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            stats: {
                totalDetections,
                totalPotholes: totalPotholes[0]?.total || 0,
                avgPotholesPerImage: Math.round(avgPotholes * 100) / 100,
                severityDistribution: severityDistribution.reduce((acc, s) => {
                    acc[s._id] = s.count;
                    return acc;
                }, {}),
                dailyDetections,
                recentDetections: recentDetections.map(d => ({
                    id: d._id,
                    originalFilename: d.originalFilename,
                    potholeCount: d.potholeCount,
                    severity: d.severity,
                    annotatedImage: `${FLASK_URL}/results/${d.annotatedImage}`,
                    createdAt: d.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * POST /api/detections/near-route
 * Find potholes near a given route (array of coordinates)
 */
router.post('/detections/near-route', async (req, res) => {
    try {
        const { coordinates, radius = 500 } = req.body; // coordinates: [[lng, lat], ...]
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
            return res.status(400).json({ error: 'Invalid coordinates array. Provide at least 2 [lng, lat] pairs.' });
        }

        const radiusInRadians = radius / 6378100; // Convert meters to radians (Earth radius)
        const uniqueIds = new Set();
        const nearbyPotholes = [];

        // Sample points along the route (max 25 query points to keep it fast)
        const sampleRate = Math.max(1, Math.floor(coordinates.length / 25));
        const sampledCoords = coordinates.filter((_, i) =>
            i === 0 || i === coordinates.length - 1 || i % sampleRate === 0
        );

        for (const coord of sampledCoords) {
            const potholes = await Detection.find({
                location: {
                    $geoWithin: {
                        $centerSphere: [coord, radiusInRadians]
                    }
                }
            }).lean();

            potholes.forEach(p => {
                const id = p._id.toString();
                if (!uniqueIds.has(id)) {
                    uniqueIds.add(id);
                    nearbyPotholes.push(p);
                }
            });
        }

        // Format response
        const formatted = nearbyPotholes.map(d => ({
            id: d._id,
            severity: d.severity,
            potholeCount: d.potholeCount,
            location: d.location,
            originalFilename: d.originalFilename,
            annotatedImage: `${FLASK_URL}/results/${d.annotatedImage}`,
            createdAt: d.createdAt
        }));

        res.json({ success: true, data: formatted, total: formatted.length });
    } catch (error) {
        console.error('Near-route error:', error.message);
        res.status(500).json({ error: 'Failed to find potholes near route' });
    }
});

/**
 * PATCH /api/detections/:id/status
 * Update the report status of a detection
 */
router.patch('/detections/:id/status', authenticate, async (req, res) => {
    try {
        const { reportStatus } = req.body;
        const validStatuses = ['reported', 'under_review', 'in_progress', 'fixed'];

        if (!reportStatus || !validStatuses.includes(reportStatus)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const detection = await Detection.findByIdAndUpdate(
            req.params.id,
            { reportStatus },
            { new: true }
        );

        if (!detection) {
            return res.status(404).json({ error: 'Detection not found' });
        }

        res.json({
            success: true,
            detection: { id: detection._id, reportStatus: detection.reportStatus }
        });
    } catch (error) {
        console.error('Status update error:', error.message);
        res.status(500).json({ error: 'Failed to update report status' });
    }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/admin/stats', authenticate, async (req, res) => {
    try {
        const totalReports = await Detection.countDocuments();

        const statusCounts = await Detection.aggregate([
            { $group: { _id: '$reportStatus', count: { $sum: 1 } } }
        ]);

        const severityCounts = await Detection.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]);

        const criticalCount = await Detection.countDocuments({ severity: { $in: ['critical', 'high'] } });
        const fixedCount = await Detection.countDocuments({ reportStatus: 'fixed' });
        const pendingCount = await Detection.countDocuments({
            reportStatus: { $in: ['reported', 'under_review', 'in_progress', null] }
        });

        res.json({
            success: true,
            stats: {
                totalReports,
                fixedReports: fixedCount,
                pendingReports: pendingCount,
                criticalPotholes: criticalCount,
                statusDistribution: statusCounts.reduce((acc, s) => {
                    acc[s._id || 'reported'] = s.count;
                    return acc;
                }, {}),
                severityDistribution: severityCounts.reduce((acc, s) => {
                    acc[s._id] = s.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

/**
 * GET /api/admin/detections
 * Get filtered detections for admin dashboard
 */
router.get('/admin/detections', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.status) filter.reportStatus = req.query.status;
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.dateFrom || req.query.dateTo) {
            filter.createdAt = {};
            if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const dateTo = new Date(req.query.dateTo);
                dateTo.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = dateTo;
            }
        }

        const total = await Detection.countDocuments(filter);
        const detections = await Detection.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const formatted = detections.map(d => ({
            id: d._id,
            fileId: d.fileId,
            originalImage: `${FLASK_URL}/uploads/${d.originalImage}`,
            annotatedImage: `${FLASK_URL}/results/${d.annotatedImage}`,
            originalFilename: d.originalFilename,
            potholeCount: d.potholeCount,
            severity: d.severity,
            reportStatus: d.reportStatus || 'reported',
            location: d.location,
            createdAt: d.createdAt
        }));

        res.json({
            success: true,
            data: formatted,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Admin detections error:', error.message);
        res.status(500).json({ error: 'Failed to fetch admin detections' });
    }
});

/**
 * DELETE /api/detections/:id
 * Delete a detection
 */
router.delete('/detections/:id', authenticate, async (req, res) => {
    try {
        const detection = await Detection.findByIdAndDelete(req.params.id);
        if (!detection) {
            return res.status(404).json({ error: 'Detection not found' });
        }
        res.json({ success: true, message: 'Detection deleted' });
    } catch (error) {
        console.error('Delete detection error:', error.message);
        res.status(500).json({ error: 'Failed to delete detection' });
    }
});

/**
 * POST /api/reports/escalate-critical
 * Escalate open critical reports by boosting priority score.
 */
const CitizenReport = require('../models/CitizenReport');
router.post('/reports/escalate-critical', authenticate, async (req, res) => {
    try {
        const openReports = await CitizenReport.find({
            reportLifecycle: { $nin: ['closed', 'fixed'] }
        }).populate('detectionId');

        const criticalReports = openReports.filter(r => r.detectionId && r.detectionId.severity === 'critical');

        let count = 0;
        for (const report of criticalReports) {
            report.priorityScore = Math.min(1.0, (report.priorityScore || 0.5) + 0.15);
            await report.save();
            count++;
        }

        res.json({ success: true, count });
    } catch (error) {
        console.error('Escalate critical reports error:', error.message);
        res.status(500).json({ error: 'Failed to escalate critical reports' });
    }
});

/**
 * POST /api/reports/bulk-escalate
 * Escalate multiple reports by boosting their priority scores.
 */
router.post('/reports/bulk-escalate', authenticate, async (req, res) => {
    try {
        const { reportIds } = req.body;
        if (!reportIds || !Array.isArray(reportIds)) {
            return res.status(400).json({ error: 'reportIds array is required' });
        }
        let count = 0;
        for (const id of reportIds) {
            const report = await CitizenReport.findById(id);
            if (report) {
                report.priorityScore = Math.min(1.0, (report.priorityScore || 0.5) + 0.15);
                await report.save();
                count++;
            }
        }
        res.json({ success: true, count });
    } catch (error) {
        console.error('Bulk escalate error:', error.message);
        res.status(500).json({ error: 'Failed to bulk escalate' });
    }
});

/**
 * POST /api/reports/bulk-close
 * Close multiple reports.
 */
router.post('/reports/bulk-close', authenticate, async (req, res) => {
    try {
        const { reportIds } = req.body;
        if (!reportIds || !Array.isArray(reportIds)) {
            return res.status(400).json({ error: 'reportIds array is required' });
        }
        let count = 0;
        for (const id of reportIds) {
            const report = await CitizenReport.findByIdAndUpdate(id, {
                reportLifecycle: 'closed',
                closedAt: new Date()
            });
            if (report) count++;
        }
        res.json({ success: true, count });
    } catch (error) {
        console.error('Bulk close error:', error.message);
        res.status(500).json({ error: 'Failed to bulk close' });
    }
});

module.exports = router;

