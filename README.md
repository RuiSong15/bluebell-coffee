# 🫐 Bluebell Coffee
### WEB700 – Web Programming | Project Part 4 | Team Blue

**Business idea:** Bluebell Coffee is a specialty coffee shop. The application lets customers browse and search the drink menu, and lets staff manage the menu records.
**Target users:** Customers (public browsing/searching) and shop staff (authenticated dashboard, administrator menu management).

---

## Project Progression

| Part | Focus | Result |
|------|-------|--------|
| Part 1 | Front-end API prototype | Interface, search/filter, visual design |
| Part 2 | Express backend with local JSON | JSON routes, EJS views, form processing |
| Part 3 | PostgreSQL, CRUD, deployment | Neon database via Sequelize, full CRUD, deployed to Vercel |
| **Part 4** | **Security layer** | **Helmet, users table, bcrypt hashing, Express Session, authentication + authorization middleware, protected CRUD** |

Part 4 does not add new business features. It secures the routes and CRUD operations already built in Part 3.

---

## Part 4: Security Architecture

| Layer | Implementation | File |
|-------|----------------|------|
| Secure response headers | Helmet enabled globally, with a Content-Security-Policy | `server.js` |
| Password storage | bcrypt hashes (10 salt rounds); plaintext is never stored | `models/User.js`, `scripts/seed-users.js` |
| Session state | Express Session, persisted in PostgreSQL (`user_sessions` table) | `config/session.js` |
| Authentication | `requireLogin` — "is this user logged in?" | `middleware/auth.js` |
| Authorization | `requireAdmin` — "is this user allowed to do this?" | `middleware/auth.js` |
| HTTPS | The deployed Vercel URL serves the application over HTTPS | deployment |

### Users Table

| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL | Primary key |
| name | VARCHAR(80), NOT NULL | Display name |
| email | VARCHAR(120), NOT NULL, UNIQUE | Login identifier |
| password_hash | VARCHAR(100), NOT NULL | bcrypt hash — never plaintext |
| role | VARCHAR(20), NOT NULL, default `viewer` | `admin` or `viewer` (whitelist-validated) |
| created_at | TIMESTAMP, NOT NULL, default now | Account creation time |

The Sequelize model uses a `defaultScope` that **excludes `password_hash` from every ordinary query**, so a hash cannot leak through a JSON route or an EJS page by accident. Only the login route uses the `withPassword` scope.

### Session Contents

The session stores **only** `{ id, name, role }`. It never stores the plaintext password, the password hash, the full user record, or database connection details. The session ID is regenerated on login to prevent session fixation.

Cookie settings: `httpOnly: true`, `sameSite: 'lax'`, `secure` in production, `maxAge` 2 hours, `resave: false`, `saveUninitialized: false`. The secret comes from the `SESSION_SECRET` environment variable and is never committed.

### Role Model

| Capability | Public | Viewer | Admin |
|------------|--------|--------|-------|
| View public menu and search | Yes | Yes | Yes |
| Public JSON list endpoint | Yes | Yes | Yes |
| Authenticated dashboard | No | Yes | Yes |
| Create records | No | No | Yes |
| Update records | No | No | Yes |
| Delete records | No | No | Yes |

**Interface vs. security:** the Edit/Delete buttons are hidden from non-admins, but this is only cosmetic. The server still applies `requireAdmin` to every admin route, so typing the URL manually or sending a request from another client is still rejected with 403.

---

## Route Access Table

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/` | Public | Home page with illustrated menu cards |
| GET | `/drinks` | Public | EJS menu list from PostgreSQL, category filter |
| GET | `/search` | Public | Search form |
| POST | `/search` | Public | Search results (validated) |
| GET | `/api/drinks` | Public | JSON list of all records |
| GET | `/api/drinks/:id` | Public | JSON single record |
| GET | `/api/search?keyword=` | Public | JSON keyword search |
| GET | `/health` | Public | Database connectivity check |
| GET | `/login` | Public | Login form |
| POST | `/login` | Public | Authenticate and create the session |
| GET | `/dashboard` | **Authenticated** | Staff dashboard (viewer or admin) |
| GET | `/api/me` | **Authenticated** | Current session identity (JSON, no hash) |
| POST | `/logout` | **Authenticated** | Destroy the session |
| GET | `/admin/drinks/new` | **Admin** | Insert form |
| POST | `/admin/drinks` | **Admin** | Validate and INSERT |
| GET | `/admin/drinks/:id/edit` | **Admin** | Prepopulated edit form |
| POST | `/admin/drinks/:id/update` | **Admin** | Validate and UPDATE |
| POST | `/admin/drinks/:id/delete` | **Admin** | DELETE after UI confirmation |
| * | anything else | Public | Handled 404 (HTML or JSON) |

### Expected Responses

| Situation | Response |
|-----------|----------|
| Not logged in (browser) | Redirect to `/login` with a message |
| Not logged in (`/api/*`) | 401 JSON |
| Logged in but not admin | 403 (HTML error page or JSON) |
| Record does not exist | 404 |
| Malformed record ID | 400 |
| Unexpected server error | 500, generic message, no stack trace |

---

## Database Design (Neon PostgreSQL)

Main table: **`drinks`** (521 imported records). Supporting tables: **`users`** (accounts) and **`user_sessions`** (session store, created automatically).

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | Primary key |
| order_id | VARCHAR(20) | |
| item_id | VARCHAR(20) | |
| name | VARCHAR(100) | NOT NULL |
| category | VARCHAR(50) | NOT NULL |
| size | VARCHAR(20) | NOT NULL, default `'N/A'` |
| price | DECIMAL(6,2) | NOT NULL, ≥ 0 |
| quantity | INTEGER | NOT NULL, ≥ 1, default 1 |
| order_type | VARCHAR(20) | NOT NULL, one of Takeout / Dine-in / Delivery |
| sku | VARCHAR(20) | |
| customer | VARCHAR(50) | |
| popularity | INTEGER | NOT NULL, ≥ 0, default 0 |
| ingredients | JSONB | NOT NULL, default `[]` |
| created_at | TIMESTAMP | NOT NULL, default now |

### JSON → Column Mapping

| JSON field | Database column | Decision |
|------------|-----------------|----------|
| `id` ("order-001") | *(dropped)* | Replaced by an auto-increment integer `id` |
| `order_id`, `item_id`, `name`, `category`, `size`, `price`, `quantity`, `order_type`, `created_at` | same names | Direct mapping with proper types |
| `details.sku` / `details.customer` / `details.popularity` | `sku` / `customer` / `popularity` | **Flattened** nested object into normal columns |
| `ingredients` (array) | `ingredients` | Stored as **JSONB** (genuinely list-shaped data) |

---

## Local Setup

```bash
npm install
copy .env.example .env      # then fill in DATABASE_URL and SESSION_SECRET
npm run seed                # one-time import of the 521 drink records
npm run seed:users          # one-time creation of the admin and viewer accounts
npm start                   # http://localhost:3000
```

### Environment Variables

| Name | Required | Purpose |
|------|----------|---------|
| `DATABASE_URL` | Yes | Neon connection string (use the **pooled** string on Vercel) |
| `SESSION_SECRET` | Yes | Signs the session cookie; long random value, never committed |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional | Credentials used by the user seed script |
| `SEED_VIEWER_EMAIL` / `SEED_VIEWER_PASSWORD` | Optional | Credentials used by the user seed script |
| `PORT` | Optional | Local port (defaults to 3000) |

Generate a session secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Accounts

Created by `npm run seed:users`. Passwords are stored only as bcrypt hashes.

| Role | Email | Capability |
|------|-------|------------|
| admin | `admin@bluebell.coffee` | Full CRUD access |
| viewer | `viewer@bluebell.coffee` | Dashboard and public pages only |

Demo passwords are intentionally simple for the in-class walkthrough. Set `SEED_ADMIN_PASSWORD` / `SEED_VIEWER_PASSWORD` in `.env` and run `npm run seed:users -- --force` to replace them with strong values.

A public registration page is intentionally **not** provided — accounts are created through the seed script, as permitted by the specification.

### Testing

- `npm run check` — database connection diagnostic
- `node scripts/test-security.js` — 53 automated security checks (Helmet headers, bcrypt, public/authenticated/admin route access, invalid login, role-escalation attempt, logout, error handling) using an in-memory PostgreSQL
- Manual: log out and try `/dashboard`; log in as viewer and try `/admin/drinks/new`; log in as admin and create/update/delete a test record, then verify it in pgAdmin

---

## Deployment (Vercel)

1. Push to the shared GitHub repository.
2. Import the repo in Vercel (`vercel.json` and `api/index.js` are already configured).
3. Add environment variables **`DATABASE_URL`** (pooled Neon string) and **`SESSION_SECRET`** for the Production environment.
4. Redeploy after changing environment variables.
5. Test `/health`, then the full logged-out → viewer → admin flow on the deployed HTTPS URL.

Note: `pg` is required explicitly and passed as `dialectModule` in `config/database.js`, because Vercel's bundler cannot trace Sequelize's dynamic driver loading. Sessions are stored in PostgreSQL rather than memory, since each serverless invocation gets a fresh process.

---

## Links

- **GitHub repository:** _add URL_
- **Deployed Vercel URL:** _add URL_
- **Trello board:** _add URL_

## Known Limitations

- Single main business table; ingredients are not normalized into a separate table.
- Only two roles (`admin`, `viewer`); no per-record ownership.
- No password reset or account self-registration flow (out of scope for Part 4).
- Success messages are passed via query string rather than flash sessions.

## Team Contributions

| Member | Contribution |
|--------|--------------|
| _name_ | _e.g. database, Sequelize models_ |
| _name_ | _e.g. CRUD routes, views_ |
| _name_ | _e.g. security layer, deployment, testing_ |

## Generative AI Disclosure

Generative AI (Claude) was used to assist with code scaffolding, security review, and documentation. The team reviewed, tested, and understands all submitted code.

*Team Blue – WEB700 Summer 2026 💙*
