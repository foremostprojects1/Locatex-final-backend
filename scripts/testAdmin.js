const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const testAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@realestate.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('Is Active:', admin.isActive);
    console.log('Password Hash:', admin.password.substring(0, 20) + '...');

    // Test password matching
    const testPassword = 'Admin@123';
    const isMatch = await admin.matchPassword(testPassword);
    
    console.log('\n🔐 Password Test:');
    console.log('Test Password:', testPassword);
    console.log('Password Match:', isMatch);

    if (isMatch) {
      console.log('✅ Password verification successful!');
    } else {
      console.log('❌ Password verification failed!');
      
      // Try to hash the password again and compare
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      console.log('New Hash:', hashedPassword.substring(0, 20) + '...');
      
      const directCompare = await bcrypt.compare(testPassword, admin.password);
      console.log('Direct bcrypt compare:', directCompare);
    }

  } catch (error) {
    console.error('Error testing admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the test
testAdmin();
