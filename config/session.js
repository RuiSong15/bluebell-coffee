// =============================================
// Bluebell Coffee – config/session.js
// WEB700 Project Part 4
// Express Session configuration.
//
// The default in-memory store is not usable on Vercel (every serverless
// invocation gets a fresh process), so sessions are persisted in the same
// Neon PostgreSQL database using connect-pg-simple. The table is created
// automatically on first use.
// =============================================

require('dotenv').config();
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pg = require('pg');

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

if (!process.env.SESSION_SECRET) {
  console.error('CONFIG WARNING: SESSION_SECRET is not set. Add it to .env locally and to the');
  console.error('deployment platform environment variables. A temporary value is being used.');
}

// Reuse a small dedicated pool for the session table
const sessionPool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
        ? false
        : { rejectUnauthorized: false },
      max: 3
    })
  : null;

const store = sessionPool
  ? new pgSession({
      pool: sessionPool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    })
  : undefined; // falls back to MemoryStore when no database is configured

module.exports = session({
  store,
  name: 'bluebell.sid',
  secret: process.env.SESSION_SECRET || 'insecure-development-secret-change-me',
  resave: false,            // do not re-save unchanged sessions
  saveUninitialized: false, // do not store empty sessions
  cookie: {
    httpOnly: true,               // client-side JavaScript cannot read the cookie
    sameSite: 'lax',              // limits cross-site cookie sending
    secure: isProduction,         // HTTPS only in production
    maxAge: 1000 * 60 * 60 * 2    // 2 hours
  }
});
