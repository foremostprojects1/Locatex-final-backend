require('dotenv').config();
const mongoose = require('mongoose');

async function run(){
  const uri = process.env.MONGODB_URI;
  if(!uri){
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  const collection = db.collection('agents');

  console.log('Unsetting empty licenseNumber values...');
  const unsetRes = await collection.updateMany({ licenseNumber: '' }, { $unset: { licenseNumber: '' } });
  console.log('Updated docs:', unsetRes.modifiedCount);

  // Check existing indexes
  const indexes = await collection.indexes();
  const hasLicenseIdx = indexes.find(i => i.name === 'licenseNumber_1');

  if(hasLicenseIdx){
    console.log('Dropping existing licenseNumber index...');
    await collection.dropIndex('licenseNumber_1').catch(err => {
      if(err.codeName === 'IndexNotFound') return; else throw err;
    });
  }

  console.log('Creating unique sparse index on licenseNumber...');
  await collection.createIndex({ licenseNumber: 1 }, { unique: true, sparse: true });

  console.log('Done.');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
