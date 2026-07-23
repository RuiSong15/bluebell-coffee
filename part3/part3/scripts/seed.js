// =============================================
// Bluebell Coffee – scripts/seed.js
// WEB700 Project Part 3
// One-time import: data/drinks.json  ->  Neon PostgreSQL "drinks" table
//
// Usage:  node scripts/seed.js
// Safety: refuses to run if the table already has records,
//         so it can never wipe production data.
// =============================================

const sequelize = require('../config/database');
const Drink = require('../models/Drink');
const drinks = require('../data/drinks.json');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to Neon PostgreSQL.');

    // Create the table only if it does not exist (non-destructive)
    await Drink.sync();

    const existing = await Drink.count();
    if (existing > 0) {
      console.log(`Table "drinks" already contains ${existing} records. Aborting to protect data.`);
      console.log('If you really want to re-import, delete the rows first in pgAdmin.');
      process.exit(0);
    }

    // Map JSON fields -> table columns (flatten nested "details")
    const rows = drinks.map(d => ({
      order_id:    d.order_id,
      item_id:     d.item_id,
      name:        d.name,
      category:    d.category,
      size:        d.size || 'N/A',
      price:       d.price,
      quantity:    d.quantity || 1,
      order_type:  d.order_type || 'Takeout',
      sku:         d.details ? d.details.sku : null,
      customer:    d.details ? d.details.customer : null,
      popularity:  d.details ? (d.details.popularity || 0) : 0,
      ingredients: d.ingredients || [],
      created_at:  d.created_at ? new Date(d.created_at) : new Date()
    }));

    await Drink.bulkCreate(rows, { validate: true });
    const total = await Drink.count();
    console.log(`Imported ${total} records into the "drinks" table.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
