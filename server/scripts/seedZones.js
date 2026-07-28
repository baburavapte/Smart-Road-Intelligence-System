#!/usr/bin/env node

/**
 * Seed Zones Script — RoadSense AI
 * Creates Vadodara zone boundaries in MongoDB with 2dsphere index.
 *
 * Usage: node scripts/seedZones.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const zonesConfig = require('../config/zones');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pothole-detection';

async function seedZones() {
  let connection;
  try {
    console.log('🔗 Connecting to MongoDB...');
    connection = await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to: ${MONGO_URI}`);

    const db = connection.connection.db;
    const zonesCollection = db.collection('zones');

    // Check existing
    const existingCount = await zonesCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Zones collection already has ${existingCount} document(s).`);
      console.log('   To re-seed, drop the collection first.\n');
      const existing = await zonesCollection.find({}, { projection: { name: 1, label: 1 } }).toArray();
      existing.forEach(z => console.log(`  • ${z.name} — ${z.label}`));
      return;
    }

    console.log('\n🌱 Seeding zones...\n');

    for (const zone of zonesConfig) {
      await zonesCollection.insertOne({
        name: zone.name,
        label: zone.label,
        color: zone.color,
        boundary: zone.boundary,
        createdAt: new Date()
      });
      console.log(`  ✅ ${zone.name} — ${zone.label} (${zone.color})`);
    }

    // Create 2dsphere index on boundary for geospatial queries
    await zonesCollection.createIndex({ boundary: '2dsphere' });
    console.log('\n📇 2dsphere index created on boundary field');
    console.log(`\n🎉 Successfully seeded ${zonesConfig.length} zones.\n`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB.');
    }
  }
}

seedZones();
