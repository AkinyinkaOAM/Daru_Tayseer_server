const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/daaru_tayseer',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_dev',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_COOKIE_EXPIRE: parseInt(process.env.JWT_COOKIE_EXPIRE) || 7,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT) || 587,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@daarutayseer.com',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@daarutayseer.com',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456',
};

module.exports = env;

