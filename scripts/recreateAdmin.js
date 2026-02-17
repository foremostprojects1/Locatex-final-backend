const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const recreateAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    const existingAdmin = await User.findOneAndDelete({ email: 'admin@realestate.com' });
    if (existingAdmin) {
      console.log('🗑️ Deleted existing admin user');
    }

    // Create new admin user
    const adminData = {
      name: 'Super Admin',
      email: 'admin@realestate.com',
      password: 'Admin@123', // Default password - should be changed
      phone: '9999999999',
      role: 'admin',
      isActive: true,
      emailVerified: true
    };

    // Create admin user (password will be hashed by pre-save hook)
    const admin = await User.create(adminData);

    console.log('✅ Super Admin recreated successfully!');
    console.log('Email:', admin.email);
    console.log('Password: Admin@123');
    console.log('Role:', admin.role);
    console.log('⚠️  Please change the password after first login!');

    // Test the password immediately
    const testAdmin = await User.findOne({ email: 'admin@realestate.com' }).select('+password');
    const isMatch = await testAdmin.matchPassword('Admin@123');
    console.log('🔐 Password test result:', isMatch ? '✅ SUCCESS' : '❌ FAILED');

  } catch (error) {
    console.error('Error recreating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
recreateAdmin();
