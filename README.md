# 🫐 Bluebell Coffee
### WEB700 – Web Programming | Project Part 2 | Team Blue

---

## How to Run

```bash
npm install
node server.js
```
Open: `http://localhost:3000`

---

## Route List

| Route | Type | Description |
|-------|------|-------------|
| GET / | HTML | Home page (same as Part 1 interface) |
| GET /drinks | HTML | Full menu with category filter |
| GET /search | HTML | Search form |
| POST /search | HTML | Search results with validation |
| GET /api/drinks | JSON | All 150 drinks |
| GET /api/drinks/:id | JSON | One drink by ID |
| GET /api/search?keyword= | JSON | Search by keyword |

---

## Project Structure

```
Bluebell_Part2/
├── server.js
├── package.json
├── data/
│   └── drinks.json        (150 records)
├── views/
│   ├── index.ejs
│   ├── drinks.ejs
│   └── search.ejs
├── public/
│   ├── style.css
│   └── app.js
└── README.md
```

*Team Blue – WEB700 Summer 2026 💙*
