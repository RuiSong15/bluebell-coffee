// =============================================
// Bluebell Coffee – models/User.js
// WEB700 Project Part 4
// Sequelize model for the "users" table.
//
// Security notes:
//  - Only the bcrypt hash is stored; the plaintext password never touches the DB.
//  - `defaultScope` excludes password_hash from every ordinary query, so a hash
//    can never leak through a JSON route or an EJS page by accident.
//  - The `withPassword` scope is used only by the login route.
// =============================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const ROLES = ['admin', 'viewer'];

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: { notEmpty: { msg: 'Name is required.' } }
  },
  email: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Email is required.' },
      isEmail:  { msg: 'A valid email address is required.' }
    }
  },
  password_hash: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'viewer',
    validate: {
      isIn: { args: [ROLES], msg: 'Role must be admin or viewer.' }
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false,
  defaultScope: {
    attributes: { exclude: ['password_hash'] }
  },
  scopes: {
    // Used only by the login route, where the hash must be compared
    withPassword: { attributes: { include: ['password_hash'] } }
  }
});

// Hash a plaintext password (used by the user seed script)
User.hashPassword = async function (plain) {
  const SALT_ROUNDS = 10;
  return bcrypt.hash(plain, SALT_ROUNDS);
};

// Compare a submitted password with this user's stored hash
User.prototype.verifyPassword = function (plain) {
  if (!this.password_hash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password_hash);
};

User.ROLES = ROLES;

module.exports = User;
