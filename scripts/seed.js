/**
 * Seed script to create default Super Super Admin user
 * Run: node scripts/seed.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seedDefaultAdmin = async () => {
  try {
    await connectDB();

    const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@daarutayseer.com')
      .trim()
      .toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Default admin already exists: ${email}`);
      process.exit(0);
    }

    // Create Super Super Admin
    const admin = await User.create({
      name: 'Super Super Admin',
      email,
      password,
      phone: '',
      role: 'super_super_admin',
      isActive: true,
    });

    console.log(`
========================================
  Default Admin Created Successfully!
========================================
  Email:    ${email}
  Password: ${password}
  Role:     Super Super Admin
========================================
  Please change the password after first login.
========================================
    `);

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedDefaultAdmin();

