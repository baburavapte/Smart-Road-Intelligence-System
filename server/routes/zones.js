/**
 * Zone Routes — RoadSense AI
 * GET /api/zones — returns all zone boundaries
 * POST /api/zones/detect — detect which zone a lat/lng falls into
 */

const express = require('express');
const router = express.Router();
const zonesConfig = require('../config/zones');

/**
 * Ray-casting point-in-polygon algorithm.
 * Determines if a point (lat, lng) is inside a GeoJSON polygon.
 * Note: GeoJSON coordinates are [lng, lat], but we accept (lat, lng) as params.
 */
function pointInPolygon(lat, lng, polygon) {
  const coords = polygon.coordinates[0]; // outer ring [lng, lat] pairs
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][1]; // lat
    const yi = coords[i][0]; // lng
    const xj = coords[j][1]; // lat
    const yj = coords[j][0]; // lng

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * GET /api/zones
 * Returns all zone definitions with name, label, color, and GeoJSON boundary.
 */
router.get('/', (req, res) => {
  try {
    const zones = zonesConfig.map(z => ({
      name: z.name,
      label: z.label,
      color: z.color,
      boundary: z.boundary
    }));

    res.json({ success: true, data: zones });
  } catch (error) {
    console.error('Fetch zones error:', error.message);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * POST /api/zones/detect
 * Detect which zone a point (lat, lng) falls into.
 * Body: { lat: number, lng: number }
 * Returns: { zone: 'Zone A', label: 'North-West', color: '#007AFF' }
 */
router.post('/detect', (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'lat and lng must be valid numbers' });
    }

    // Check each zone
    for (const zone of zonesConfig) {
      if (pointInPolygon(latitude, longitude, zone.boundary)) {
        return res.json({
          success: true,
          zone: zone.name,
          label: zone.label,
          color: zone.color
        });
      }
    }

    // Point is outside all defined zones
    res.json({
      success: true,
      zone: 'Unknown',
      label: 'Outside city limits',
      color: '#6E6E73'
    });

  } catch (error) {
    console.error('Zone detection error:', error.message);
    res.status(500).json({ error: 'Failed to detect zone' });
  }
});

module.exports = router;
