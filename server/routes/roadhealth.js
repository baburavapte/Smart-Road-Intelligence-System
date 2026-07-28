const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const auditLogger = require('../middleware/audit');
const RoadHealth = require('../models/RoadHealth');
const Detection = require('../models/Detection');
const CitizenReport = require('../models/CitizenReport');

const severityWeights = { none: 0, low: 0.3, medium: 0.5, high: 0.8, critical: 1.0 };

/**
 * GET /api/road-health
 * Get all roads with health scores
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const roads = await RoadHealth.find()
            .sort({ healthScore: 1 })
            .lean();

        res.json({ success: true, data: roads });
    } catch (error) {
        console.error('Road health fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch road health data' });
    }
});

/**
 * GET /api/road-health/geojson
 * GeoJSON for map layer
 */
router.get('/geojson', async (req, res) => {
    try {
        const roads = await RoadHealth.find({
            centerCoordinates: { $exists: true, $ne: [] }
        }).lean();

        const features = roads.map(r => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: r.centerCoordinates
            },
            properties: {
                id: r._id,
                roadName: r.roadName,
                healthScore: r.healthScore,
                healthCategory: r.healthCategory,
                totalPotholes: r.totalPotholes,
                lastCalculated: r.lastCalculated,
                boundingBox: r.boundingBox
            }
        }));

        res.json({ type: 'FeatureCollection', features });
    } catch (error) {
        console.error('Road health GeoJSON error:', error.message);
        res.status(500).json({ error: 'Failed to fetch road health GeoJSON' });
    }
});

/**
 * GET /api/road-health/priority
 * Get roads ranked by repair priority
 * Priority = (0.35 × Severity Impact) + (0.25 × Complaint Volume) + (0.25 × Inverse RHI) + (0.15 × Historical Frequency)
 */
router.get('/priority', authenticate, async (req, res) => {
    try {
        const roads = await RoadHealth.find().lean();
        const priorityList = [];

        for (const road of roads) {
            // Count citizen reports for detections within this road's bounding box
            let complaintCount = 0;
            let historicalFrequency = 0;

            if (road.boundingBox && road.boundingBox.minLat) {
                const detectionsInArea = await Detection.find({
                    'location.coordinates.0': { $gte: road.boundingBox.minLng, $lte: road.boundingBox.maxLng },
                    'location.coordinates.1': { $gte: road.boundingBox.minLat, $lte: road.boundingBox.maxLat }
                }).select('_id').lean();

                const detectionIds = detectionsInArea.map(d => d._id);
                complaintCount = await CitizenReport.countDocuments({ detectionId: { $in: detectionIds } });

                // Historical frequency: detections in last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                historicalFrequency = await Detection.countDocuments({
                    'location.coordinates.0': { $gte: road.boundingBox.minLng, $lte: road.boundingBox.maxLng },
                    'location.coordinates.1': { $gte: road.boundingBox.minLat, $lte: road.boundingBox.maxLat },
                    createdAt: { $gte: thirtyDaysAgo }
                });
            }

            // Normalize scores (0-1 scale)
            const severityImpact = road.avgSeverityWeight || 0; // Already 0-1
            const complaintNormalized = Math.min(complaintCount / 10, 1); // Cap at 10 complaints
            const inverseRHI = 1 - (road.healthScore / 100);
            const histFreqNormalized = Math.min(historicalFrequency / 20, 1); // Cap at 20

            const priorityScore = (0.35 * severityImpact) +
                (0.25 * complaintNormalized) +
                (0.25 * inverseRHI) +
                (0.15 * histFreqNormalized);

            priorityList.push({
                id: road._id,
                roadName: road.roadName,
                healthScore: road.healthScore,
                healthCategory: road.healthCategory,
                totalPotholes: road.totalPotholes,
                complaintCount,
                historicalFrequency,
                priorityScore: Math.round(priorityScore * 100) / 100,
                lastCalculated: road.lastCalculated
            });
        }

        priorityList.sort((a, b) => b.priorityScore - a.priorityScore);

        // Add rank
        priorityList.forEach((item, idx) => { item.rank = idx + 1; });

        res.json({ success: true, data: priorityList });
    } catch (error) {
        console.error('Priority calculation error:', error.message);
        res.status(500).json({ error: 'Failed to calculate priority' });
    }
});

/**
 * POST /api/road-health/roads
 * Admin: define a new road zone
 */
router.post('/roads', authenticate, async (req, res) => {
    try {
        const { roadName, boundingBox } = req.body;
        if (!roadName) {
            return res.status(400).json({ error: 'roadName is required' });
        }

        const existing = await RoadHealth.findOne({ roadName });
        if (existing) {
            return res.status(409).json({ error: 'Road with this name already exists' });
        }

        // Calculate center coordinates from bounding box
        let centerCoordinates = [];
        if (boundingBox && boundingBox.minLat) {
            centerCoordinates = [
                (boundingBox.minLng + boundingBox.maxLng) / 2,
                (boundingBox.minLat + boundingBox.maxLat) / 2
            ];
        }

        const road = await RoadHealth.create({
            roadName,
            boundingBox: boundingBox || {},
            centerCoordinates,
            healthScore: 100,
            totalPotholes: 0,
            avgSeverityWeight: 0,
            lastCalculated: new Date()
        });

        res.status(201).json({ success: true, road });
    } catch (error) {
        console.error('Create road error:', error.message);
        res.status(500).json({ error: 'Failed to create road' });
    }
});

/**
 * POST /api/road-health/calculate
 * Recalculate all road health scores from detection data
 */
router.post('/calculate', authenticate, auditLogger('recalculate_road_health', 'RoadHealth'), async (req, res) => {
    try {
        const roads = await RoadHealth.find();
        const results = [];

        for (const road of roads) {
            if (!road.boundingBox || !road.boundingBox.minLat) {
                results.push({ roadName: road.roadName, status: 'skipped', reason: 'no bounding box' });
                continue;
            }

            // Find detections within bounding box
            const detections = await Detection.find({
                'location.coordinates.0': { $gte: road.boundingBox.minLng, $lte: road.boundingBox.maxLng },
                'location.coordinates.1': { $gte: road.boundingBox.minLat, $lte: road.boundingBox.maxLat }
            }).lean();

            const totalPotholes = detections.reduce((sum, d) => sum + (d.potholeCount || 0), 0);
            const totalWeight = detections.reduce((sum, d) => sum + (severityWeights[d.severity] || 0), 0);
            const avgSeverityWeight = detections.length > 0 ? totalWeight / detections.length : 0;

            // Health score: 100 - (pothole density impact)
            // More potholes + higher severity = lower score
            const densityPenalty = Math.min(totalPotholes * 5, 60); // Max 60 points from density
            const severityPenalty = avgSeverityWeight * 40; // Max 40 points from severity
            const healthScore = Math.max(0, Math.round(100 - densityPenalty - severityPenalty));

            road.healthScore = healthScore;
            road.totalPotholes = totalPotholes;
            road.avgSeverityWeight = Math.round(avgSeverityWeight * 100) / 100;
            road.lastCalculated = new Date();
            road.history.push({ score: healthScore, calculatedAt: new Date() });

            // Keep only last 90 days of history
            if (road.history.length > 90) {
                road.history = road.history.slice(-90);
            }

            await road.save();
            results.push({ roadName: road.roadName, healthScore, totalPotholes, status: 'calculated' });
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Calculate road health error:', error.message);
        res.status(500).json({ error: 'Failed to calculate road health' });
    }
});

/**
 * GET /api/road-health/:id
 * Get single road detail with history
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const road = await RoadHealth.findById(req.params.id).lean();
        if (!road) {
            return res.status(404).json({ error: 'Road not found' });
        }
        res.json({ success: true, road });
    } catch (error) {
        console.error('Fetch road detail error:', error.message);
        res.status(500).json({ error: 'Failed to fetch road detail' });
    }
});

/**
 * GET /api/road-health/:id/forecast
 * Simple linear regression forecast for 30/60/90 days
 */
router.get('/:id/forecast', authenticate, async (req, res) => {
    try {
        const road = await RoadHealth.findById(req.params.id).lean();
        if (!road) {
            return res.status(404).json({ error: 'Road not found' });
        }

        const history = road.history || [];
        const currentScore = road.healthScore;

        // Need at least 2 data points for regression
        if (history.length < 2) {
            return res.json({
                success: true,
                forecast: {
                    currentScore,
                    day30: currentScore,
                    day60: currentScore,
                    day90: currentScore,
                    trend: 'stable',
                    confidence: 'low',
                    dataPoints: history.length
                }
            });
        }

        // Simple linear regression on recent history
        const points = history.slice(-30).map((h, i) => ({ x: i, y: h.score }));
        const n = points.length;
        const sumX = points.reduce((s, p) => s + p.x, 0);
        const sumY = points.reduce((s, p) => s + p.y, 0);
        const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
        const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / n;

        // Project forward (each unit ≈ 1 calculation cycle, assume daily)
        const lastX = n - 1;
        const day30 = Math.max(0, Math.min(100, Math.round(intercept + slope * (lastX + 30))));
        const day60 = Math.max(0, Math.min(100, Math.round(intercept + slope * (lastX + 60))));
        const day90 = Math.max(0, Math.min(100, Math.round(intercept + slope * (lastX + 90))));

        const trend = slope < -0.5 ? 'declining' : slope > 0.5 ? 'improving' : 'stable';
        const confidence = n >= 15 ? 'high' : n >= 5 ? 'medium' : 'low';

        res.json({
            success: true,
            forecast: {
                currentScore,
                day30,
                day60,
                day90,
                trend,
                confidence,
                slope: Math.round(slope * 100) / 100,
                dataPoints: n
            }
        });
    } catch (error) {
        console.error('Forecast error:', error.message);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});

/**
 * GET /api/road-health/forecast/critical
 * Roads predicted to go critical within 90 days
 */
router.get('/forecast/critical', async (req, res) => {
    try {
        const roads = await RoadHealth.find().lean();
        const criticalPredictions = [];

        for (const road of roads) {
            if (road.healthCategory === 'critical') continue; // Already critical
            const history = road.history || [];
            if (history.length < 2) continue;

            const points = history.slice(-30).map((h, i) => ({ x: i, y: h.score }));
            const n = points.length;
            const sumX = points.reduce((s, p) => s + p.x, 0);
            const sumY = points.reduce((s, p) => s + p.y, 0);
            const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
            const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
            if (slope >= 0) continue; // Not declining

            const intercept = (sumY - slope * sumX) / n;
            const lastX = n - 1;
            const day90Score = Math.max(0, Math.round(intercept + slope * (lastX + 90)));

            if (day90Score <= 25) {
                // Estimate days to critical
                const daysToCritical = slope !== 0 ? Math.round((25 - road.healthScore) / slope) : 999;

                criticalPredictions.push({
                    id: road._id,
                    roadName: road.roadName,
                    currentScore: road.healthScore,
                    predictedScore90: day90Score,
                    estimatedDaysToCritical: Math.max(0, daysToCritical),
                    centerCoordinates: road.centerCoordinates
                });
            }
        }

        criticalPredictions.sort((a, b) => a.estimatedDaysToCritical - b.estimatedDaysToCritical);

        res.json({ success: true, data: criticalPredictions });
    } catch (error) {
        console.error('Critical forecast error:', error.message);
        res.status(500).json({ error: 'Failed to fetch critical forecasts' });
    }
});

module.exports = router;
