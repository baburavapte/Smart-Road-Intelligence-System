/**
 * Vadodara Zone Boundaries — GeoJSON Configuration
 * 4 zones dividing the city into quadrants.
 * Coordinates are approximate ward boundaries.
 */

module.exports = [
  {
    name: 'Zone A',
    label: 'North-West',
    color: '#007AFF',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [73.1400, 22.3500],
        [73.1812, 22.3500],
        [73.1812, 22.3072],
        [73.1400, 22.3072],
        [73.1400, 22.3500]
      ]]
    }
  },
  {
    name: 'Zone B',
    label: 'North-East',
    color: '#30D158',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [73.1812, 22.3500],
        [73.2200, 22.3500],
        [73.2200, 22.3072],
        [73.1812, 22.3072],
        [73.1812, 22.3500]
      ]]
    }
  },
  {
    name: 'Zone C',
    label: 'South-West',
    color: '#FFD60A',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [73.1400, 22.3072],
        [73.1812, 22.3072],
        [73.1812, 22.2700],
        [73.1400, 22.2700],
        [73.1400, 22.3072]
      ]]
    }
  },
  {
    name: 'Zone D',
    label: 'South-East',
    color: '#FF453A',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [73.1812, 22.3072],
        [73.2200, 22.3072],
        [73.2200, 22.2700],
        [73.1812, 22.2700],
        [73.1812, 22.3072]
      ]]
    }
  }
];
