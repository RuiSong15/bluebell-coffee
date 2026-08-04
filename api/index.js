// =============================================
// Bluebell Coffee – api/index.js
// Vercel serverless entry point.
// Vercel treats every file in /api as a serverless function; this one
// simply re-exports the Express app defined in server.js.
// =============================================

module.exports = require('../server.js');
