// =============================================
// Bluebell Coffee – config/database.js
// WEB700 Project Part 3
// One reusable Sequelize connection to Neon PostgreSQL.
//
// If DATABASE_URL is missing we do NOT crash the process: on a serverless
// platform that produces an unhelpful "function invocation failed" page.
// Instead we log the problem and let the routes return a handled error,
// which also satisfies the "missing environment configuration" requirement.
// =============================================

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Sequelize loads the PostgreSQL driver dynamically, which serverless bundlers
// (Vercel) cannot detect. Requiring it explicitly and passing it as
// `dialectModule` guarantees the driver is included in the deployment bundle.
const pg = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('CONFIG ERROR: DATABASE_URL environment variable is not set.');
  console.error('Locally: copy .env.example to .env and add your Neon connection string.');
  console.error('On Vercel: add DATABASE_URL under Project Settings > Environment Variables, then redeploy.');
}

// Neon requires SSL; a local test database does not
const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL || '');

// A syntactically valid placeholder keeps the Sequelize constructor from
// throwing at load time; any query will then fail with a handled error.
const connectionString = DATABASE_URL || 'postgres://missing:missing@localhost:5432/missing';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: isLocal || !DATABASE_URL ? {} : {
    ssl: { require: true, rejectUnauthorized: false }
  },
  pool: { max: 5, min: 0, idle: 10000 }
});

sequelize.isConfigured = Boolean(DATABASE_URL);

module.exports = sequelize;
