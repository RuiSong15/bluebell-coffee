// =============================================
// Bluebell Coffee Shop – server.js
// WEB700 Project Part 3
// Data source: Neon PostgreSQL via Sequelize
// (Part 2 local JSON is no longer used at runtime)
// =============================================

require('dotenv').config();
const express = require('express');
const path    = require('path');
const { Op }  = require('sequelize');

const sequelize = require('./config/database');
const Drink     = require('./models/Drink');

const app  = express();
const PORT = process.env.PORT || 3000;

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const CATEGORIES  = ['Hot Drinks', 'Cold Drinks', 'Tea', 'Bakery', 'Dessert'];
const ORDER_TYPES = ['Takeout', 'Dine-in', 'Delivery'];

// ---------- helpers ----------

// Validate form input; returns { values, errors }
function validateDrinkForm(body) {
  const errors = [];
  const values = {
    name:       (body.name || '').trim(),
    category:   (body.category || '').trim(),
    size:       (body.size || 'N/A').trim(),
    price:      (body.price || '').toString().trim(),
    quantity:   (body.quantity || '1').toString().trim(),
    order_type: (body.order_type || '').trim(),
    customer:   (body.customer || '').trim(),
    sku:        (body.sku || '').trim(),
    popularity: (body.popularity || '0').toString().trim(),
    ingredients:(body.ingredients || '').trim()
  };

  if (!values.name) errors.push('Drink name is required.');
  if (!values.category) errors.push('Category is required.');

  const price = parseFloat(values.price);
  if (values.price === '' || isNaN(price)) errors.push('Price must be a number.');
  else if (price < 0) errors.push('Price cannot be negative.');

  const quantity = parseInt(values.quantity, 10);
  if (isNaN(quantity) || quantity < 1) errors.push('Quantity must be a whole number of at least 1.');

  if (!ORDER_TYPES.includes(values.order_type)) errors.push('Order type must be Takeout, Dine-in, or Delivery.');

  const popularity = parseInt(values.popularity, 10);
  if (isNaN(popularity) || popularity < 0) errors.push('Popularity must be a non-negative whole number.');

  return { values, errors, price, quantity, popularity };
}

// Parse and validate :id parameter; returns integer or null
function parseId(raw) {
  const id = parseInt(raw, 10);
  return (Number.isInteger(id) && id > 0 && String(id) === String(raw)) ? id : null;
}

// Build the row object for create/update from validated form data
function buildRow(v) {
  return {
    name: v.values.name,
    category: v.values.category,
    size: v.values.size || 'N/A',
    price: v.price,
    quantity: v.quantity,
    order_type: v.values.order_type,
    customer: v.values.customer || null,
    sku: v.values.sku || null,
    popularity: v.popularity,
    ingredients: v.values.ingredients
      ? v.values.ingredients.split(',').map(s => s.trim()).filter(Boolean)
      : []
  };
}

// ============================================
// HTML / EJS ROUTES
// ============================================

// GET / — Home page (front-end fetches /api/drinks)
app.get('/', (req, res) => {
  res.render('index');
});

// GET /drinks — Menu page from PostgreSQL, with category filter
app.get('/drinks', async (req, res, next) => {
  try {
    const category = req.query.category || 'all';
    const where = category === 'all' ? {} : { category };
    const drinks = await Drink.findAll({ where, order: [['id', 'ASC']] });

    const cats = await Drink.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      raw: true
    });

    res.render('drinks', {
      drinks,
      categories: cats.map(c => c.category).sort(),
      selectedCategory: category,
      message: req.query.message || null
    });
  } catch (err) { next(err); }
});

// GET /search — Show search form
app.get('/search', (req, res) => {
  res.render('search', { results: [], error: null, keyword: '' });
});

// POST /search — Search PostgreSQL with validation
app.post('/search', async (req, res, next) => {
  try {
    const keyword = req.body.keyword ? req.body.keyword.trim() : '';
    if (!keyword) {
      return res.render('search', { results: [], error: 'Please enter a search keyword.', keyword: '' });
    }
    const results = await Drink.findAll({
      where: {
        [Op.or]: [
          { name:       { [Op.iLike]: `%${keyword}%` } },
          { category:   { [Op.iLike]: `%${keyword}%` } },
          { order_type: { [Op.iLike]: `%${keyword}%` } }
        ]
      },
      order: [['id', 'ASC']]
    });
    res.render('search', { results, error: null, keyword });
  } catch (err) { next(err); }
});

// ============================================
// CREATE — insert form (menu management)
// ============================================

// GET /drinks/add — Show insert form
app.get('/drinks/add', (req, res) => {
  res.render('add', { errors: [], values: {}, categories: CATEGORIES, orderTypes: ORDER_TYPES });
});

// POST /drinks/add — Validate and insert a new record
app.post('/drinks/add', async (req, res, next) => {
  try {
    const v = validateDrinkForm(req.body);
    if (v.errors.length > 0) {
      // Preserve entered values when validation fails
      return res.status(400).render('add', {
        errors: v.errors, values: v.values,
        categories: CATEGORIES, orderTypes: ORDER_TYPES
      });
    }
    const drink = await Drink.create(buildRow(v));
    res.redirect(`/drinks?message=${encodeURIComponent(`Added "${drink.name}" (ID ${drink.id})`)}`);
  } catch (err) { next(err); }
});

// ============================================
// UPDATE — edit an existing menu record
// ============================================

// GET /drinks/:id/edit — Prepopulated edit form
app.get('/drinks/:id/edit', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).render('error', { title: 'Invalid ID', message: `"${req.params.id}" is not a valid record ID.` });

    const drink = await Drink.findByPk(id);
    if (!drink) return res.status(404).render('error', { title: 'Not Found', message: `Record ${id} does not exist.` });

    res.render('edit', {
      errors: [], drink,
      values: {
        name: drink.name, category: drink.category, size: drink.size,
        price: drink.price, quantity: drink.quantity, order_type: drink.order_type,
        customer: drink.customer || '', sku: drink.sku || '',
        popularity: drink.popularity,
        ingredients: (drink.ingredients || []).join(', ')
      },
      categories: CATEGORIES, orderTypes: ORDER_TYPES
    });
  } catch (err) { next(err); }
});

// POST /drinks/:id/edit — Validate and persist changes
app.post('/drinks/:id/edit', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).render('error', { title: 'Invalid ID', message: `"${req.params.id}" is not a valid record ID.` });

    const drink = await Drink.findByPk(id);
    if (!drink) return res.status(404).render('error', { title: 'Not Found', message: `Record ${id} does not exist.` });

    const v = validateDrinkForm(req.body);
    if (v.errors.length > 0) {
      return res.status(400).render('edit', {
        errors: v.errors, drink, values: v.values,
        categories: CATEGORIES, orderTypes: ORDER_TYPES
      });
    }
    await drink.update(buildRow(v));
    res.redirect(`/drinks?message=${encodeURIComponent(`Updated "${drink.name}" (ID ${drink.id})`)}`);
  } catch (err) { next(err); }
});

// ============================================
// DELETE — remove a discontinued menu record
// (UI confirmation happens in drinks.ejs via confirm())
// ============================================

// POST /drinks/:id/delete
app.post('/drinks/:id/delete', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).render('error', { title: 'Invalid ID', message: `"${req.params.id}" is not a valid record ID.` });

    const drink = await Drink.findByPk(id);
    if (!drink) {
      return res.status(404).render('error', { title: 'Not Found', message: `Record ${id} was not found. It may have already been removed.` });
    }
    const name = drink.name;
    await drink.destroy();
    res.redirect(`/drinks?message=${encodeURIComponent(`Removed "${name}" (ID ${id})`)}`);
  } catch (err) { next(err); }
});

// ============================================
// JSON / API ROUTES
// ============================================

// GET /api/drinks — All records from PostgreSQL
app.get('/api/drinks', async (req, res, next) => {
  try {
    const drinks = await Drink.findAll({ order: [['id', 'ASC']] });
    res.json(drinks);
  } catch (err) { next(err); }
});

// GET /api/search?keyword=value — Search via query string
app.get('/api/search', async (req, res, next) => {
  try {
    const keyword = req.query.keyword ? req.query.keyword.trim() : '';
    if (!keyword) return res.status(400).json({ message: 'Please provide a keyword.' });

    const results = await Drink.findAll({
      where: {
        [Op.or]: [
          { name:     { [Op.iLike]: `%${keyword}%` } },
          { category: { [Op.iLike]: `%${keyword}%` } }
        ]
      },
      order: [['id', 'ASC']]
    });
    res.json({ keyword, count: results.length, results });
  } catch (err) { next(err); }
});

// GET /api/drinks/:id — One record by ID
app.get('/api/drinks/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: `"${req.params.id}" is not a valid record ID.` });

    const drink = await Drink.findByPk(id);
    if (!drink) return res.status(404).json({ message: `Record ${id} not found.` });
    res.json(drink);
  } catch (err) { next(err); }
});

// GET /health — Confirm the app can reach the cloud database
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const count = await Drink.count();
    res.json({ status: 'ok', database: 'connected', records: count });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 — unknown route
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: `Route ${req.path} not found.` });
  }
  res.status(404).render('error', { title: '404 – Page Not Found', message: `The page "${req.path}" does not exist.` });
});

// Central error handler — no stack traces or connection strings exposed
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  const isValidation = err.name === 'SequelizeValidationError';
  const message = isValidation
    ? err.errors.map(e => e.message).join(' ')
    : 'Something went wrong on our side. Please try again later.';
  const status = isValidation ? 400 : 500;

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ message });
  }
  res.status(status).render('error', { title: 'Error', message });
});

// ============================================
// START
// ============================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Bluebell Coffee running at http://localhost:${PORT}`);
  });
}

module.exports = app; // for Vercel serverless deployment
