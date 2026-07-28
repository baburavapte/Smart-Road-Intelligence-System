/**
 * Dashboard Routes — RoadSense AI
 * GET /api/dashboard/kpis — live KPI metrics from MongoDB
 */

const express = require('express');
const router = express.Router();
const CitizenReport = require('../models/CitizenReport');
const RepairRecord = require('../models/RepairRecord');
const RoadHealth = require('../models/RoadHealth');
const Detection = require('../models/Detection');

/**
 * GET /api/dashboard/kpis
 * Returns live KPI data aggregated from MongoDB collections.
 */
router.get('/kpis', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all queries in parallel for performance
    const [
      totalRoadsResult,
      activePotholesResult,
      resolvedTodayResult,
      openReports,
      recentDetections
    ] = await Promise.all([
      // Total roads tracked
      RoadHealth.countDocuments({}),

      // Active potholes (not closed or fixed)
      CitizenReport.countDocuments({
        reportLifecycle: { $nin: ['closed', 'fixed'] }
      }),

      // Resolved today
      RepairRecord.countDocuments({
        completedAt: { $gte: today },
        status: 'complete'
      }),

      // Open reports for SLA calculation
      CitizenReport.find({
        reportLifecycle: { $nin: ['closed', 'fixed'] }
      }).populate({
        path: 'detectionId',
        select: 'severity'
      }).lean(),

      // Recent detections for AI confidence
      Detection.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .select('detections')
        .lean()
    ]);

    // Calculate overdue count based on SLA thresholds
    let overdueCount = 0;
    openReports.forEach(report => {
      const ageMs = Date.now() - new Date(report.createdAt).getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const severity = report.detectionId?.severity || 'low';

      let slaLimit = 14; // low
      if (severity === 'critical') slaLimit = 3;
      else if (severity === 'high' || severity === 'medium' || severity === 'moderate') slaLimit = 7;

      if (ageDays > slaLimit) overdueCount++;
    });

    // Calculate average AI confidence from recent detections
    let aiConfidence = 97.0; // fallback
    const allConfidences = [];
    recentDetections.forEach(det => {
      if (det.detections && Array.isArray(det.detections)) {
        det.detections.forEach(d => {
          if (d.confidence) allConfidences.push(d.confidence * 100);
        });
      }
    });
    if (allConfidences.length > 0) {
      aiConfidence = Math.round(
        (allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length) * 10
      ) / 10;
    }

    res.json({
      success: true,
      totalRoads: totalRoadsResult || 0,
      activePotholes: activePotholesResult || 0,
      resolvedToday: resolvedTodayResult || 0,
      overdueCount,
      aiConfidence,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard KPI error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard KPIs' });
  }
});

module.exports = router;
