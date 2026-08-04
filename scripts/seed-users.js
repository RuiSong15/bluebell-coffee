// =============================================
// Bluebell Coffee – scripts/seed-users.js
// WEB700 Project Part 4
// One-time creation of the test accounts required by the specification:
// one administrator and one viewer.
//
// Usage:  npm run seed:users            create the accounts if they are missing
//         npm run seed:users -- --force reset the password of existing accounts
//
// Passwords are read from environment variables when available so that real
// credentials never live in the repository. The defaults below are simple on
// purpose for the classroom demonstration and should be replaced with strong
// values (via .env) before the application is left running publicly.
// =============================================

require('dotenv').config();
const sequelize = require('../config/database');
const User = require('../models/User');

const FORCE = process.argv.includes('--force');

const ACCOUNTS = [
  {
    name: 'Bluebell Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@bluebell.coffee',
    password: process.env.SEED_ADMIN_PASSWORD || 'abc123',
    role: 'admin'
  },
  {
    name: 'Bluebell Viewer',
    email: process.env.SEED_VIEWER_EMAIL || 'viewer@bluebell.coffee',
    password: process.env.SEED_VIEWER_PASSWORD || 'abc123',
    role: 'viewer'
  }
];

async function seedUsers() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL.');

    // Create the users table if it does not exist (non-destructive)
    await User.sync();

    for (const account of ACCOUNTS) {
      const existing = await User.findOne({ where: { email: account.email } });
      const password_hash = await User.hashPassword(account.password);

      if (existing) {
        if (!FORCE) {
          console.log(`- ${account.email} already exists (role: ${existing.role}), skipped.`);
          console.log('  Run "npm run seed:users -- --force" to reset its password.');
          continue;
        }
        await existing.update({ name: account.name, role: account.role, password_hash });
        console.log(`~ Reset password for ${account.role} account: ${account.email}`);
        continue;
      }

      await User.create({
        name: account.name,
        email: account.email,
        role: account.role,
        password_hash
      });
      console.log(`+ Created ${account.role} account: ${account.email}`);
    }

    const total = await User.count();
    console.log(`\nDone. The users table now has ${total} account(s).`);
    console.log('Passwords are stored as bcrypt hashes only — no plaintext is saved.');
    process.exit(0);
  } catch (err) {
    console.error('User seed failed:', err.message);
    process.exit(1);
  }
}

seedUsers();
