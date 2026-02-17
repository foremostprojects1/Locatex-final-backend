const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create super admin user
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

    console.log('✅ Super Admin created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: Admin@123');
    console.log('Role:', admin.role);
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
createSuperAdmin();
