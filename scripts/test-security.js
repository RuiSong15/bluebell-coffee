// Part 4 security test harness — in-memory Postgres + MemoryStore sessions
process.env.DATABASE_URL = '';                 // force MemoryStore for the test
process.env.SESSION_SECRET = 'test-secret-for-local-verification-only';
const path = require('path');
const { newDb } = require('pg-mem');
const { Sequelize } = require('sequelize');

const mem = newDb({ noAstCoverageCheck: true });
const pgModule = mem.adapters.createPg();
const sequelize = new Sequelize('postgres://t:t@localhost:5432/t', {
  dialect: 'postgres', dialectModule: pgModule, logging: false
});
sequelize.isConfigured = true;

const cfgPath = path.resolve(__dirname, 'config/database.js');
require.cache[cfgPath] = { id: cfgPath, filename: cfgPath, loaded: true, exports: sequelize };

const Drink = require('./models/Drink');
const User  = require('./models/User');
const app   = require('./server');
const drinks = require('./data/drinks.json');

const BASE = 'http://localhost:4711';
let pass = 0, fail = 0;
function check(label, cond, extra='') {
  (cond ? pass++ : fail++);
  console.log(`${cond ? '  PASS' : '! FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
}

// Minimal cookie jar
function jar() {
  let cookies = {};
  return {
    header: () => Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; '),
    absorb(res) {
      const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      set.forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0,i)] = kv.slice(i+1); });
    },
    clear() { cookies = {}; }
  };
}
async function req(method, p, { body, cookie, redirect='manual' } = {}) {
  const opts = { method, redirect, headers: {} };
  if (cookie) opts.headers['Cookie'] = cookie.header();
  if (body) { opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'; opts.body = new URLSearchParams(body).toString(); }
  const r = await fetch(BASE + p, opts);
  if (cookie) cookie.absorb(r);
  return { status: r.status, loc: r.headers.get('location'), headers: r.headers, text: await r.text() };
}

async function main() {
  await Drink.sync(); await User.sync();
  await Drink.bulkCreate(drinks.slice(0, 20).map(d => ({
    order_id:d.order_id, item_id:d.item_id, name:d.name, category:d.category,
    size:d.size||'N/A', price:d.price, quantity:d.quantity||1, order_type:d.order_type||'Takeout',
    sku:d.details?.sku||null, customer:d.details?.customer||null,
    popularity:d.details?.popularity||0, ingredients:d.ingredients||[], created_at:new Date(d.created_at)
  })), { validate:true });

  await User.create({ name:'Bluebell Admin', email:'admin@bluebell.coffee', role:'admin',
    password_hash: await User.hashPassword('AdminPass123!') });
  await User.create({ name:'Bluebell Viewer', email:'viewer@bluebell.coffee', role:'viewer',
    password_hash: await User.hashPassword('ViewerPass123!') });

  const server = app.listen(4711);
  let r;

  console.log('\n--- 1. Helmet ---');
  r = await req('GET', '/');
  check('Helmet: X-Content-Type-Options', r.headers.get('x-content-type-options') === 'nosniff');
  check('Helmet: Content-Security-Policy present', !!r.headers.get('content-security-policy'));
  check('Helmet: X-Frame-Options / frame-ancestors', !!r.headers.get('x-frame-options') || /frame-ancestors/.test(r.headers.get('content-security-policy')||''));
  check('Helmet: Strict-Transport-Security', !!r.headers.get('strict-transport-security'));
  check('Helmet: X-Powered-By removed', !r.headers.get('x-powered-by'));

  console.log('\n--- 2. Password hashing ---');
  const raw = await User.scope('withPassword').findOne({ where:{ email:'admin@bluebell.coffee' } });
  check('Stored value is a bcrypt hash, not plaintext', raw.password_hash.startsWith('$2') && !raw.password_hash.includes('AdminPass123!'));
  check('bcrypt verify accepts the correct password', await raw.verifyPassword('AdminPass123!'));
  check('bcrypt verify rejects a wrong password', !(await raw.verifyPassword('WrongPass')));
  const defaultFetch = await User.findOne({ where:{ email:'admin@bluebell.coffee' } });
  check('Default scope hides password_hash', defaultFetch.password_hash === undefined);

  console.log('\n--- 3. Public routes stay public ---');
  for (const p of ['/', '/drinks', '/search', '/login', '/api/drinks', '/health']) {
    r = await req('GET', p);
    check(`GET ${p} is public`, r.status === 200, `(${r.status})`);
  }

  console.log('\n--- 4. Unauthenticated access is blocked ---');
  r = await req('GET', '/dashboard');
  check('GET /dashboard redirects to /login', r.status === 302 && (r.loc||'').startsWith('/login'), `(${r.status} ${r.loc})`);
  r = await req('GET', '/admin/drinks/new');
  check('GET /admin/drinks/new redirects to /login', r.status === 302 && (r.loc||'').startsWith('/login'));
  r = await req('POST', '/admin/drinks', { body:{ name:'Hack', category:'Tea', price:'1', quantity:'1', order_type:'Takeout' } });
  check('POST /admin/drinks blocked when logged out', r.status === 302 && (r.loc||'').startsWith('/login'));
  r = await req('POST', '/admin/drinks/1/delete');
  check('POST delete blocked when logged out', r.status === 302 && (r.loc||'').startsWith('/login'));
  r = await req('GET', '/api/me');
  check('GET /api/me returns 401 JSON', r.status === 401 && JSON.parse(r.text).message.includes('Authentication'));
  const beforeCount = await Drink.count();

  console.log('\n--- 5. Invalid login ---');
  const bad = jar();
  r = await req('POST', '/login', { body:{ email:'admin@bluebell.coffee', password:'WrongPassword' }, cookie:bad });
  check('Wrong password returns 401', r.status === 401, `(${r.status})`);
  check('Generic error message shown', r.text.includes('Invalid email or password'));
  check('No hash leaked in the response', !r.text.includes('$2a$') && !r.text.includes('$2b$'));
  r = await req('POST', '/login', { body:{ email:'nobody@nowhere.com', password:'whatever' }, cookie:bad });
  check('Unknown email gives the same generic message', r.status === 401 && r.text.includes('Invalid email or password'));
  r = await req('POST', '/login', { body:{ email:'', password:'' }, cookie:bad });
  check('Missing fields return 400', r.status === 400);

  console.log('\n--- 6. Viewer login (authenticated, not admin) ---');
  const viewer = jar();
  r = await req('POST', '/login', { body:{ email:'viewer@bluebell.coffee', password:'ViewerPass123!' }, cookie:viewer });
  check('Viewer login redirects', r.status === 302, `(${r.status} -> ${r.loc})`);
  r = await req('GET', '/dashboard', { cookie:viewer });
  check('Viewer can open /dashboard', r.status === 200 && r.text.includes('Bluebell Viewer'));
  r = await req('GET', '/api/me', { cookie:viewer });
  const me = JSON.parse(r.text);
  check('Session stores id/name/role only', r.status===200 && Object.keys(me.user).sort().join(',') === 'id,name,role');
  check('Session does NOT contain a password hash', !r.text.includes('password'));
  r = await req('GET', '/admin/drinks/new', { cookie:viewer });
  check('Viewer gets 403 on admin form', r.status === 403, `(${r.status})`);
  r = await req('POST', '/admin/drinks', { body:{ name:'ViewerHack', category:'Tea', price:'3', quantity:'1', order_type:'Takeout' }, cookie:viewer });
  check('Viewer POST create returns 403', r.status === 403);
  r = await req('POST', '/admin/drinks/1/delete', { cookie:viewer });
  check('Viewer POST delete returns 403', r.status === 403);
  check('No record created by the viewer', (await Drink.count()) === beforeCount);
  r = await req('GET', '/drinks', { cookie:viewer });
  check('Menu page hides Edit/Delete from viewer', !r.text.includes('/admin/drinks/'));

  console.log('\n--- 7. Role cannot be escalated via the form ---');
  r = await req('POST', '/login', { body:{ email:'viewer@bluebell.coffee', password:'ViewerPass123!', role:'admin' }, cookie:jar() });
  const spoof = jar();
  await req('POST', '/login', { body:{ email:'viewer@bluebell.coffee', password:'ViewerPass123!', role:'admin' }, cookie:spoof });
  r = await req('GET', '/api/me', { cookie:spoof });
  check('Submitted role=admin is ignored', JSON.parse(r.text).user.role === 'viewer');

  console.log('\n--- 8. Admin login and protected CRUD ---');
  const admin = jar();
  r = await req('POST', '/login', { body:{ email:'admin@bluebell.coffee', password:'AdminPass123!' }, cookie:admin });
  check('Admin login redirects to /dashboard', r.status === 302 && r.loc === '/dashboard', `(${r.loc})`);
  r = await req('GET', '/admin/drinks/new', { cookie:admin });
  check('Admin can open the insert form', r.status === 200);
  r = await req('POST', '/admin/drinks', { body:{ name:'', price:'-5', order_type:'X' }, cookie:admin });
  check('Admin create still validates input (400)', r.status === 400 && r.text.includes('Please fix'));
  r = await req('POST', '/admin/drinks', { body:{ name:'Security Test Latte', category:'Hot Drinks', size:'Medium', price:'4.75', quantity:'1', order_type:'Takeout', ingredients:'Espresso, Milk' }, cookie:admin });
  check('Admin create succeeds', r.status === 302, `(${r.status})`);
  const created = await Drink.findOne({ where:{ name:'Security Test Latte' } });
  check('Record exists in the database', !!created);
  r = await req('GET', `/admin/drinks/${created.id}/edit`, { cookie:admin });
  check('Admin edit form is prepopulated', r.status===200 && r.text.includes('Security Test Latte'));
  r = await req('POST', `/admin/drinks/${created.id}/update`, { body:{ name:'Security Test Latte v2', category:'Hot Drinks', size:'Large', price:'5.25', quantity:'2', order_type:'Dine-in' }, cookie:admin });
  await created.reload();
  check('Admin update persists', r.status===302 && created.name==='Security Test Latte v2' && Number(created.price)===5.25);
  r = await req('GET', '/drinks', { cookie:admin });
  check('Menu page shows admin action buttons', r.text.includes('/admin/drinks/'));
  r = await req('POST', `/admin/drinks/${created.id}/delete`, { cookie:admin });
  check('Admin delete succeeds', r.status===302 && !(await Drink.findByPk(created.id)));

  console.log('\n--- 9. Logout removes access ---');
  r = await req('POST', '/logout', { cookie:admin });
  check('Logout redirects', r.status === 302);
  r = await req('GET', '/dashboard', { cookie:admin });
  check('Dashboard blocked after logout', r.status === 302 && (r.loc||'').startsWith('/login'), `(${r.status})`);
  r = await req('GET', '/admin/drinks/new', { cookie:admin });
  check('Admin route blocked after logout', r.status === 302 && (r.loc||'').startsWith('/login'));
  r = await req('GET', '/api/me', { cookie:admin });
  check('/api/me returns 401 after logout', r.status === 401);

  console.log('\n--- 10. Error handling ---');
  r = await req('GET', '/nope');
  check('Unknown page returns 404', r.status === 404);
  r = await req('GET', '/api/nope');
  check('Unknown API route returns JSON 404', r.status === 404 && !!JSON.parse(r.text).message);
  const adm2 = jar();
  await req('POST', '/login', { body:{ email:'admin@bluebell.coffee', password:'AdminPass123!' }, cookie:adm2 });
  r = await req('GET', '/admin/drinks/abc/edit', { cookie:adm2 });
  check('Malformed ID returns 400', r.status === 400);
  r = await req('GET', '/admin/drinks/99999/edit', { cookie:adm2 });
  check('Missing record returns 404', r.status === 404);
  check('No stack trace leaked', !r.text.includes('at Object.') && !r.text.includes('node_modules'));

  console.log(`\n==================  ${pass} passed, ${fail} failed  ==================\n`);
  server.close();
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
