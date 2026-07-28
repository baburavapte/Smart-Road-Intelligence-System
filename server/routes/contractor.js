/**
 * Contractor Routes — RoadSense AI
 * Real MongoDB queries for contractor management.
 *
 * GET  /api/contractors          — list all contractors with stats
 * GET  /api/contractors/:id      — single contractor + assigned jobs
 * GET  /api/contractors/:id/performance — performance metrics
 * GET  /api/contractors/:name/jobs — jobs by contractor name (legacy)
 * POST /api/contractors/:id/assign — assign a report to contractor
 * PUT  /api/contractors/:id/status — update repair status
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authenticate = require('../middleware/auth');
const auditLogger = require('../middleware/audit');
const Contractor = require('../models/Contractor');
const CitizenReport = require('../models/CitizenReport');
const RepairRecord = require('../models/RepairRecord');
const { sendEmail } = require('../services/notifications');

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

/**
 * GET /api/contractors
 * List all contractors with real stats from MongoDB.
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.zone) filter.zone = req.query.zone;
    if (req.query.available === 'true') filter.isAvailable = true;

    const contractors = await Contractor.find(filter).lean();

    const formatted = [];
    for (const contractor of contractors) {
      // Count active jobs (lifecycle = assigned or in_progress)
      const activeJobs = await CitizenReport.countDocuments({
        assignedTeam: contractor.name,
        reportLifecycle: { $in: ['assigned', 'in_progress'] }
      });

      // Count completed jobs
      const completedJobs = await CitizenReport.countDocuments({
        assignedTeam: contractor.name,
        reportLifecycle: { $in: ['fixed', 'closed'] }
      });

      formatted.push({
        id: contractor._id,
        name: contractor.name,
        phone: contractor.phone,
        email: contractor.email,
        specialization: contractor.specialization,
        rating: contractor.rating,
        activeJobs,
        completedJobs,
        onTimeRate: contractor.onTimeRate || 0,
        avgResolutionDays: contractor.avgResolutionDays || 0,
        zone: contractor.zone,
        isAvailable: contractor.isAvailable,
        location: contractor.location,
        joinedDate: contractor.joinedDate
      });
    }

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Fetch contractors error:', error.message);
    res.status(500).json({ error: 'Failed to fetch contractors' });
  }
});

/**
 * GET /api/contractors/:id
 * Single contractor with full assigned jobs list.
 */
router.get('/:id', async (req, res) => {
  try {
    // Check if param is a MongoID or a name
    let contractor;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      contractor = await Contractor.findById(req.params.id).lean();
    }

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get assigned jobs
    const jobs = await CitizenReport.find({ assignedTeam: contractor.name })
      .populate({
        path: 'detectionId',
        select: 'originalImage annotatedImage potholeCount severity location originalFilename createdAt'
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedJobs = jobs.map(r => ({
      id: r._id,
      reporterName: r.reporterName,
      description: r.description,
      reportLifecycle: r.reportLifecycle,
      assignedTeam: r.assignedTeam,
      createdAt: r.createdAt,
      verifiedAt: r.verifiedAt,
      assignedAt: r.assignedAt,
      fixedAt: r.fixedAt,
      closedAt: r.closedAt,
      daysOpen: Math.round((Date.now() - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
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
      contractor: {
        id: contractor._id,
        name: contractor.name,
        phone: contractor.phone,
        email: contractor.email,
        specialization: contractor.specialization,
        rating: contractor.rating,
        onTimeRate: contractor.onTimeRate,
        avgResolutionDays: contractor.avgResolutionDays,
        zone: contractor.zone,
        isAvailable: contractor.isAvailable
      },
      jobs: formattedJobs
    });
  } catch (error) {
    console.error('Fetch contractor error:', error.message);
    res.status(500).json({ error: 'Failed to fetch contractor' });
  }
});

/**
 * GET /api/contractors/:id/performance
 * Performance metrics for a contractor.
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const contractor = await Contractor.findById(req.params.id).lean();
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    const totalAssigned = await CitizenReport.countDocuments({ assignedTeam: contractor.name });
    const completed = await CitizenReport.countDocuments({
      assignedTeam: contractor.name,
      reportLifecycle: { $in: ['fixed', 'closed'] }
    });
    const inProgress = await CitizenReport.countDocuments({
      assignedTeam: contractor.name,
      reportLifecycle: 'in_progress'
    });

    // Overdue: open reports past SLA
    const openReports = await CitizenReport.find({
      assignedTeam: contractor.name,
      reportLifecycle: { $in: ['assigned', 'in_progress'] }
    }).populate({ path: 'detectionId', select: 'severity' }).lean();

    let overdue = 0;
    openReports.forEach(r => {
      const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000);
      const sev = r.detectionId?.severity || 'low';
      const limit = sev === 'critical' ? 3 : (sev === 'high' || sev === 'moderate' ? 7 : 14);
      if (ageDays > limit) overdue++;
    });

    // Jobs by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyJobs = await CitizenReport.aggregate([
      {
        $match: {
          assignedTeam: contractor.name,
          assignedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$assignedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      totalAssigned,
      completed,
      inProgress,
      overdue,
      onTimeRate: contractor.onTimeRate,
      avgResolutionDays: contractor.avgResolutionDays,
      rating: contractor.rating,
      jobsByMonth: monthlyJobs.map(m => ({ month: m._id, count: m.count }))
    });
  } catch (error) {
    console.error('Contractor performance error:', error.message);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

/**
 * GET /api/contractors/:name/jobs
 * Get assigned repairs for a contractor by their name (legacy endpoint).
 */
router.get('/:name/jobs', async (req, res) => {
  try {
    const { name } = req.params;

    const reports = await CitizenReport.find({ assignedTeam: name })
      .populate({
        path: 'detectionId',
        select: 'originalImage annotatedImage potholeCount severity location originalFilename createdAt'
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = reports.map(r => ({
      id: r._id,
      reporterName: r.reporterName,
      description: r.description,
      reportLifecycle: r.reportLifecycle,
      assignedTeam: r.assignedTeam,
      createdAt: r.createdAt,
      verifiedAt: r.verifiedAt,
      assignedAt: r.assignedAt,
      fixedAt: r.fixedAt,
      closedAt: r.closedAt,
      detection: r.detectionId ? {
        id: r.detectionId._id,
        originalImage: `${FLASK_URL}/uploads/${r.detectionId.originalImage}`,
        annotatedImage: `${FLASK_URL}/results/${r.detectionId.annotatedImage}`,
        potholeCount: r.detectionId.potholeCount,
        severity: r.detectionId.severity,
        location: r.detectionId.location,
        createdAt: r.detectionId.createdAt
      } : null
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Fetch contractor jobs error:', error.message);
    res.status(500).json({ error: 'Failed to fetch contractor jobs' });
  }
});

/**
 * POST /api/contractors/:id/assign
 * Assign a report to a contractor.
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const { reportId, scheduledDate, notes } = req.body;

    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required' });
    }

    const contractor = await Contractor.findById(req.params.id);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Update citizen report
    const report = await CitizenReport.findByIdAndUpdate(reportId, {
      assignedTeam: contractor.name,
      reportLifecycle: 'assigned',
      assignedAt: new Date()
    }, { new: true });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Increment contractor stats
    contractor.totalJobsAssigned = (contractor.totalJobsAssigned || 0) + 1;
    await contractor.save();

    // Send email notification to contractor
    if (contractor.email) {
      await sendEmail(contractor.email, 'statusChanged', report, 'assigned');
    }

    // Send email to citizen
    if (report.reporterEmail) {
      await sendEmail(report.reporterEmail, 'statusChanged', report, 'assigned');
    }

    res.json({ success: true, report: { id: report._id, reportLifecycle: report.reportLifecycle } });
  } catch (error) {
    console.error('Assign contractor error:', error.message);
    res.status(500).json({ error: 'Failed to assign contractor' });
  }
});

/**
 * PUT /api/contractors/:id/status
 * Update repair status (in_progress or complete).
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { repairId, status, notes } = req.body;

    if (!repairId || !status) {
      return res.status(400).json({ error: 'repairId and status are required' });
    }

    if (!['in_progress', 'complete'].includes(status)) {
      return res.status(400).json({ error: 'Status must be in_progress or complete' });
    }

    const contractor = await Contractor.findById(req.params.id);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Map status to lifecycle
    const lifecycle = status === 'complete' ? 'fixed' : 'in_progress';

    const update = { reportLifecycle: lifecycle };
    if (status === 'complete') update.fixedAt = new Date();

    const report = await CitizenReport.findByIdAndUpdate(repairId, update, { new: true });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update contractor stats on completion
    if (status === 'complete') {
      contractor.completedCount = (contractor.completedCount || 0) + 1;
      await contractor.save();

      // Send completion email to citizen
      if (report.reporterEmail) {
        await sendEmail(report.reporterEmail, 'repairComplete', report);
      }
    }

    // Send status update email
    if (report.reporterEmail && status !== 'complete') {
      await sendEmail(report.reporterEmail, 'statusChanged', report, lifecycle);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update status error:', error.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/contractors
 * Create a new contractor team (Admin only)
 */
router.post('/', authenticate, auditLogger('create_contractor', 'Contractor'), async (req, res) => {
  try {
    const { name, email, phone, zone, rating } = req.body;
    if (!name || !zone) {
      return res.status(400).json({ error: 'Name and Zone are required' });
    }
    const contractor = await Contractor.create({
      name,
      email: email || '',
      phone: phone || '',
      zone,
      rating: rating || 5.0,
      isAvailable: true,
      completedCount: 0
    });
    res.status(201).json({ success: true, contractor });
  } catch (error) {
    console.error('Create contractor error:', error.message);
    res.status(500).json({ error: 'Failed to create contractor' });
  }
});

/**
 * PUT /api/contractors/:id
 * Edit contractor team (Admin only)
 */
router.put('/:id', authenticate, auditLogger('edit_contractor', 'Contractor'), async (req, res) => {
  try {
    const { name, email, phone, zone, rating, isAvailable } = req.body;
    const contractor = await Contractor.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, zone, rating, isAvailable },
      { new: true }
    );
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    res.json({ success: true, contractor });
  } catch (error) {
    console.error('Edit contractor error:', error.message);
    res.status(500).json({ error: 'Failed to edit contractor' });
  }
});

/**
 * DELETE /api/contractors/:id
 * Delete contractor team (Admin only)
 */
router.delete('/:id', authenticate, auditLogger('delete_contractor', 'Contractor'), async (req, res) => {
  try {
    const contractor = await Contractor.findByIdAndDelete(req.params.id);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    res.json({ success: true, message: 'Contractor deleted' });
  } catch (error) {
    console.error('Delete contractor error:', error.message);
    res.status(500).json({ error: 'Failed to delete contractor' });
  }
});

module.exports = router;
