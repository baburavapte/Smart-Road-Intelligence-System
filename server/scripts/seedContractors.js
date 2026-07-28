#!/usr/bin/env node

/**
 * Seed Contractors Script — RoadSense AI
 * Creates sample contractor records in MongoDB.
 *
 * Usage: node scripts/seedContractors.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pothole-detection';

const SEED_CONTRACTORS = [
  {
    name: 'Rajesh Constructions',
    phone: '+91-9876543001',
    email: 'rajesh@constructions.in',
    specialization: 'Asphalt Repair',
    completedCount: 47,
    totalJobsAssigned: 52,
    avgResolutionDays: 3.2,
    onTimeRate: 92,
    rating: 4.5,
    zone: 'Zone A',
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.1650, 22.3200] },
    joinedDate: new Date('2024-03-15')
  },
  {
    name: 'Mehta Road Works',
    phone: '+91-9876543002',
    email: 'mehta@roadworks.in',
    specialization: 'Full Road',
    completedCount: 31,
    totalJobsAssigned: 35,
    avgResolutionDays: 5.1,
    onTimeRate: 88,
    rating: 4.2,
    zone: 'Zone B',
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.1950, 22.3300] },
    joinedDate: new Date('2024-01-10')
  },
  {
    name: 'Patel Infrastructure',
    phone: '+91-9876543003',
    email: 'patel@infra.in',
    specialization: 'Drainage',
    completedCount: 22,
    totalJobsAssigned: 28,
    avgResolutionDays: 6.8,
    onTimeRate: 78,
    rating: 3.8,
    zone: 'Zone C',
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.1600, 22.2900] },
    joinedDate: new Date('2024-06-20')
  },
  {
    name: 'Vadodara RoadCare',
    phone: '+91-9876543004',
    email: 'roadcare@vadodara.in',
    specialization: 'Road Marking',
    completedCount: 65,
    totalJobsAssigned: 68,
    avgResolutionDays: 2.1,
    onTimeRate: 95,
    rating: 4.7,
    zone: 'Zone D',
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.2000, 22.2850] },
    joinedDate: new Date('2023-11-01')
  },
  {
    name: 'GS Construction Co',
    phone: '+91-9876543005',
    email: 'gs@construction.in',
    specialization: 'Asphalt Repair',
    completedCount: 38,
    totalJobsAssigned: 45,
    avgResolutionDays: 4.3,
    onTimeRate: 85,
    rating: 4.1,
    zone: 'Zone A',
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.1750, 22.3400] },
    joinedDate: new Date('2024-02-28')
  },
  {
    name: 'Modi Engineers',
    phone: '+91-9876543006',
    email: 'modi@engineers.in',
    specialization: 'Full Road',
    completedCount: 54,
    totalJobsAssigned: 59,
    avgResolutionDays: 3.7,
    onTimeRate: 91,
    rating: 4.4,
    zone: 'Zone C',
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.1700, 22.2950] },
    joinedDate: new Date('2023-09-15')
  }
];

async function seedContractors() {
  let connection;
  try {
    console.log('🔗 Connecting to MongoDB...');
    connection = await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to: ${MONGO_URI}`);

    const db = connection.connection.db;
    const contractorsCollection = db.collection('contractors');

    const existingCount = await contractorsCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Contractors collection already has ${existingCount} document(s).`);
      const existing = await contractorsCollection.find({}, { projection: { name: 1, specialization: 1 } }).toArray();
      existing.forEach(c => console.log(`  • ${c.name} — ${c.specialization}`));
      return;
    }

    console.log('\n🌱 Seeding contractors...\n');

    for (const contractor of SEED_CONTRACTORS) {
      const doc = {
        ...contractor,
        activeJobs: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await contractorsCollection.insertOne(doc);
      console.log(`  ✅ ${contractor.name.padEnd(25)} | ${contractor.specialization.padEnd(15)} | ${contractor.zone} | ${contractor.onTimeRate}% on-time | ⭐ ${contractor.rating}`);
    }

    // Create indexes
    await contractorsCollection.createIndex({ name: 1 }, { unique: true });
    await contractorsCollection.createIndex({ zone: 1 });
    await contractorsCollection.createIndex({ location: '2dsphere' });

    console.log('\n📇 Indexes created on: name, zone, location (2dsphere)');
    console.log(`\n🎉 Successfully seeded ${SEED_CONTRACTORS.length} contractors.\n`);

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

seedContractors();
