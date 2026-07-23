// =============================================
// Bluebell Coffee – models/Drink.js
// WEB700 Project Part 3
// Sequelize model mapped to the "drinks" table in Neon PostgreSQL.
//
// JSON-to-column mapping decisions:
//  - Nested "details" object  -> flattened into sku / customer / popularity columns
//  - "ingredients" array      -> stored as JSONB (genuinely list-shaped data)
//  - "id" ("order-001")       -> replaced by an auto-increment integer primary key
// =============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Drink = sequelize.define('Drink', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  item_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'Drink name is required.' } }
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { notEmpty: { msg: 'Category is required.' } }
  },
  size: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'N/A'
  },
  price: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    validate: {
      isDecimal: { msg: 'Price must be a number.' },
      min: { args: [0], msg: 'Price cannot be negative.' }
    },
    get() {
      // DECIMAL comes back as a string; return a number for views/JSON
      const v = this.getDataValue('price');
      return v === null ? null : parseFloat(v);
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      isInt: { msg: 'Quantity must be a whole number.' },
      min: { args: [1], msg: 'Quantity must be at least 1.' }
    }
  },
  order_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Takeout',
    validate: {
      isIn: {
        args: [['Takeout', 'Dine-in', 'Delivery']],
        msg: 'Order type must be Takeout, Dine-in, or Delivery.'
      }
    }
  },
  sku: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  customer: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  popularity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: { msg: 'Popularity must be a whole number.' },
      min: { args: [0], msg: 'Popularity cannot be negative.' }
    }
  },
  ingredients: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'drinks',
  timestamps: false
});

module.exports = Drink;
