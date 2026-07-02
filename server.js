// =============================================
// Bluebell Coffee Shop – server.js
// WEB700 Project Part 2
// Data source: Kaggle Coffee Shop Dataset
// =============================================

const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = 3000;

const drinks = require('./data/drinks.json');

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ============================================
// HTML / EJS ROUTES
// ============================================

// GET / — Home page
app.get('/', (req, res) => {
  res.render('index');
});

// GET /drinks — Menu page with category filter
app.get('/drinks', (req, res) => {
  const category = req.query.category || 'all';
  const filtered = category === 'all'
    ? drinks
    : drinks.filter(d => d.category === category);

  res.render('drinks', {
    drinks: filtered,
    categories: [...new Set(drinks.map(d => d.category))],
    selectedCategory: category
  });
});

// GET /search — Show search form
app.get('/search', (req, res) => {
  res.render('search', { results: [], error: null, keyword: '' });
});

// POST /search — Process search with validation
app.post('/search', (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword.trim() : '';

  if (!keyword) {
    return res.render('search', {
      results: [],
      error: 'Please enter a search keyword.',
      keyword: ''
    });
  }

  const results = drinks.filter(d =>
    d.name.toLowerCase().includes(keyword.toLowerCase()) ||
    d.category.toLowerCase().includes(keyword.toLowerCase()) ||
    d.order_type.toLowerCase().includes(keyword.toLowerCase())
  );

  res.render('search', { results, error: null, keyword });
});

// ============================================
// JSON / API ROUTES
// ============================================

// GET /api/drinks — All records as JSON
app.get('/api/drinks', (req, res) => {
  res.json(drinks);
});

// GET /api/drinks/:id — One record by ID
app.get('/api/drinks/:id', (req, res) => {
  const drink = drinks.find(d => d.id === req.params.id);
  if (!drink) {
    return res.status(404).json({ message: `Record "${req.params.id}" not found.` });
  }
  res.json(drink);
});

// GET /api/search?keyword=value — Search via query string
app.get('/api/search', (req, res) => {
  const keyword = req.query.keyword ? req.query.keyword.trim() : '';
  if (!keyword) {
    return res.status(400).json({ message: 'Please provide a keyword.' });
  }
  const results = drinks.filter(d =>
    d.name.toLowerCase().includes(keyword.toLowerCase()) ||
    d.category.toLowerCase().includes(keyword.toLowerCase())
  );
  res.json({ keyword, count: results.length, results });
});

// Start server
app.listen(PORT, () => {
  console.log(`Bluebell Coffee running at http://localhost:${PORT}`);
});
