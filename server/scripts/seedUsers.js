require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pothole-detection';
  console.log('🔗 Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  
  await User.deleteMany({});
  
  const users = await User.create([
    {
      name: 'Test Citizen',
      email: 'citizen@test.com',
      passwordHash: await bcrypt.hash('citizen123', 12),
      role: 'citizen',
      isActive: true
    },
    {
      name: 'PWD Officer Ramesh',
      officerId: 'OFFICER123',
      passwordHash: await bcrypt.hash('officer123', 12),
      role: 'officer',
      isActive: true
    },
    {
      name: 'System Admin',
      email: 'admin@smartcity.gov.in',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'admin',
      isActive: true
    }
  ]);

  console.log('✅ Users seeded successfully!');
  console.log('   Citizen:  citizen@test.com / citizen123');
  console.log('   Officer:  OFFICER123 / officer123');
  console.log('   Admin:    admin@smartcity.gov.in / admin123');
  console.log('⚠️  Change passwords before going live!');
  
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
