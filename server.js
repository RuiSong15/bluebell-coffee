// =============================================
// Bluebell Coffee Shop – server.js
// WEB700 Project Part 4
// Part 3: PostgreSQL data layer through Sequelize.
// Part 4: Helmet, bcrypt password hashing, Express Session,
//         authentication middleware, authorization middleware,
//         and protected CRUD routes.
// =============================================

require('dotenv').config();
const express = require('express');
const path    = require('path');
const helmet  = require('helmet');
const { Op }  = require('sequelize');

const sequelize     = require('./config/database');
const sessionConfig = require('./config/session');
const Drink         = require('./models/Drink');
const User          = require('./models/User');
const { currentUser, requireLogin, requireAdmin, redirectIfLoggedIn } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// Vercel terminates TLS in front of the app; trusting the proxy lets the
// session cookie's `secure` flag work correctly behind HTTPS.
app.set('trust proxy', 1);

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// SECURITY MIDDLEWARE (applies to every route)
// ============================================

// Helmet sets protective HTTP response headers (CSP, X-Frame-Options,
// X-Content-Type-Options, Referrer-Policy, HSTS, and others).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Inline styles are used inside the EJS templates from Part 3
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:'],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Express Session — keeps the authenticated user's identity on the server
app.use(sessionConfig);
// Expose the logged-in user to all templates as `currentUser`
app.use(currentUser);

const CATEGORIES  = ['Hot Drinks', 'Cold Drinks', 'Tea', 'Bakery', 'Dessert'];
const ORDER_TYPES = ['Takeout', 'Dine-in', 'Delivery'];

// ---------- helpers ----------

// Validate drink form input; returns { values, errors }
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

// Parse and validate an :id route parameter; returns a positive integer or null
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
// PUBLIC ROUTES
// ============================================

// GET / — Home page (front-end fetches /api/drinks)
app.get('/', (req, res) => {
  res.render('index');
});

// GET /drinks — Public menu page from PostgreSQL, with category filter
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

// GET /search — Public search form
app.get('/search', (req, res) => {
  res.render('search', { results: [], error: null, keyword: '' });
});

// POST /search — Public search with validation
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
// AUTHENTICATION ROUTES (login / logout)
// ============================================

// GET /login — Public login form
app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', {
    error: null,
    email: '',
    message: req.query.message || null
  });
});

// POST /login — Validate credentials, then create the session
app.post('/login', redirectIfLoggedIn, async (req, res, next) => {
  const email    = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  // Deliberately generic so the response cannot be used to discover
  // which email addresses exist in the database.
  const GENERIC_ERROR = 'Invalid email or password.';

  try {
    // 1. Required fields must be present
    if (!email || !password) {
      return res.status(400).render('login', {
        error: 'Email and password are both required.',
        email,
        message: null
      });
    }

    // 2. Look the user up, including the hash (login is the only place that needs it)
    const user = await User.scope('withPassword').findOne({ where: { email } });

    // 3. Compare the submitted password with the stored bcrypt hash
    const passwordMatches = user ? await user.verifyPassword(password) : false;

    if (!user || !passwordMatches) {
      return res.status(401).render('login', { error: GENERIC_ERROR, email, message: null });
    }

    // 4. Regenerate the session id on login (prevents session fixation)
    const returnTo = req.session.returnTo;
    req.session.regenerate(err => {
      if (err) return next(err);

      // 5. Store ONLY the identity and role — never the hash or the full record
      req.session.user = { id: user.id, name: user.name, role: user.role };

      req.session.save(saveErr => {
        if (saveErr) return next(saveErr);
        const target = returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard';
        res.redirect(target);
      });
    });
  } catch (err) { next(err); }
});

// POST /logout — Destroy the session (authenticated users only)
app.post('/logout', requireLogin, (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('bluebell.sid');
    res.redirect('/?message=' + encodeURIComponent('You have been logged out.'));
  });
});

// ============================================
// AUTHENTICATED ROUTES (any logged-in user)
// ============================================

// GET /dashboard — Requires authentication only (viewer or admin)
app.get('/dashboard', requireLogin, async (req, res, next) => {
  try {
    const totalDrinks = await Drink.count();
    const categories  = await Drink.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('price')), 'avg_price']
      ],
      group: ['category'],
      order: [['category', 'ASC']],
      raw: true
    });
    const recent = await Drink.findAll({ order: [['id', 'DESC']], limit: 5 });

    res.render('dashboard', { totalDrinks, categories, recent });
  } catch (err) { next(err); }
});

// ============================================
// ADMIN-ONLY ROUTES (protected CRUD)
// Every route below requires authentication AND the admin role.
// ============================================

// GET /admin/drinks/new — Insert form
app.get('/admin/drinks/new', requireAdmin, (req, res) => {
  res.render('add', { errors: [], values: {}, categories: CATEGORIES, orderTypes: ORDER_TYPES });
});

// POST /admin/drinks — Validate and INSERT a new record
app.post('/admin/drinks', requireAdmin, async (req, res, next) => {
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

// GET /admin/drinks/:id/edit — Prepopulated edit form
app.get('/admin/drinks/:id/edit', requireAdmin, async (req, res, next) => {
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

// POST /admin/drinks/:id/update — Validate and UPDATE
app.post('/admin/drinks/:id/update', requireAdmin, async (req, res, next) => {
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

// POST /admin/drinks/:id/delete — DELETE after the UI confirmation step
app.post('/admin/drinks/:id/delete', requireAdmin, async (req, res, next) => {
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
// JSON / API ROUTES (public read access)
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

// GET /api/me — Who am I? (authenticated users only; never returns a hash)
app.get('/api/me', requireLogin, (req, res) => {
  res.json({ user: req.session.user });
});

// GET /health — Confirm the app can reach the cloud database
app.get('/health', async (req, res) => {
  if (!sequelize.isConfigured) {
    return res.status(503).json({
      status: 'error',
      database: 'not configured',
      message: 'DATABASE_URL environment variable is not set on this deployment.'
    });
  }
  try {
    await sequelize.authenticate();
    const count = await Drink.count();
    res.json({ status: 'ok', database: 'connected', records: count });
  } catch (err) {
    console.error('Health check failed:', err.message);
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

// Central error handler — never exposes stack traces, SQL, or credentials
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
