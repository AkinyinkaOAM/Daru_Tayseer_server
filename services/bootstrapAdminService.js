const User = require('../models/User');

const ensureDefaultAdmin = async () => {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@daarutayseer.com')
    .trim()
    .toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    return existingAdmin;
  }

  const admin = await User.create({
    name: 'Super Super Admin',
    email,
    password,
    phone: '',
    role: 'super_super_admin',
    isActive: true,
  });

  console.log(`Default admin created: ${email}`);
  return admin;
};

module.exports = { ensureDefaultAdmin };
