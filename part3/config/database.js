// =============================================
// Bluebell Coffee – config/database.js
// WEB700 Project Part 3
// One reusable Sequelize connection to Neon PostgreSQL
// =============================================

require('dotenv').config();
const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Copy .env.example to .env and add your Neon connection string.');
  process.exit(1);
}

// Neon requires SSL; a local test database does not
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: isLocal ? {} : {
    ssl: { require: true, rejectUnauthorized: false }
  },
  pool: { max: 5, min: 0, idle: 10000 }
});

module.exports = sequelize;
