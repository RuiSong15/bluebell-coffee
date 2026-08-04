// =============================================
// Bluebell Coffee – middleware/auth.js
// WEB700 Project Part 4
// Reusable authentication and authorization middleware.
//
// Authentication = "is this user logged in?"   -> requireLogin
// Authorization  = "is this user allowed to?"  -> requireAdmin
//
// Both return JSON for /api/* requests and HTML/redirects for browser pages.
// =============================================

// Makes the logged-in user available to every EJS template as `currentUser`
function currentUser(req, res, next) {
  res.locals.currentUser = (req.session && req.session.user) || null;
  next();
}

// Authentication: the request must belong to a logged-in session
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }
  // Remember where the user wanted to go, then send them to the login page
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login?message=' + encodeURIComponent('Please log in to continue.'));
}

// Authorization: the logged-in user must also hold the admin role.
// The role is read from the server-side session, never from the request body.
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login?message=' + encodeURIComponent('Please log in to continue.'));
  }

  if (req.session.user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: 'Administrator access is required for this action.' });
    }
    return res.status(403).render('error', {
      title: '403 – Forbidden',
      message: 'Your account does not have permission to perform this action. Administrator access is required.'
    });
  }

  return next();
}

// Convenience: keep logged-in users away from the login form
function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  return next();
}

module.exports = { currentUser, requireLogin, requireAdmin, redirectIfLoggedIn };
