// =============================================
// Bluebell Coffee – scripts/generate-images.js
// Generates one SVG illustration per menu item + a hero banner.
// Usage: node scripts/generate-images.js   ->  public/images/*.svg
// =============================================

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'images');
fs.mkdirSync(OUT, { recursive: true });

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- shared pieces ----------

const BG = {
  'Hot Drinks':  ['#fdf3e7', '#f5e3cd'],
  'Cold Drinks': ['#e9f2fc', '#d7e6f7'],
  'Tea':         ['#edf5ec', '#dcebda'],
  'Bakery':      ['#faf1e0', '#f2e2c4'],
  'Dessert':     ['#fdeef2', '#f8dce4']
};

function wrap(category, inner) {
  const [c1, c2] = BG[category];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="320" height="320" rx="28" fill="url(#bg)"/>
<ellipse cx="160" cy="272" rx="92" ry="14" fill="#000000" opacity="0.07"/>
${inner}
</svg>`;
}

const steam = (x, col = '#b9a493') => `
<path d="M${x} 92 q-8 -14 0 -26 q8 -12 0 -24" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
<path d="M${x + 24} 96 q-8 -14 0 -26 q8 -12 0 -22" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" opacity="0.4"/>`;

// Side-view cup on a saucer (hot drinks & tea)
function cup({ liquid = '#6f4e37', art = null, tag = null, steamCol }) {
  return `
${steam(140, steamCol)}
<ellipse cx="160" cy="258" rx="78" ry="12" fill="#ffffff" stroke="#d8cfc4" stroke-width="3"/>
<path d="M96 130 L110 240 q2 14 20 14 h60 q18 0 20 -14 L224 130 Z" fill="#ffffff" stroke="#d8cfc4" stroke-width="4"/>
<path d="M222 150 q34 -4 34 26 q0 30 -40 28" fill="none" stroke="#d8cfc4" stroke-width="9" stroke-linecap="round"/>
<ellipse cx="160" cy="132" rx="64" ry="16" fill="${liquid}"/>
<ellipse cx="160" cy="132" rx="64" ry="16" fill="none" stroke="#00000018" stroke-width="2"/>
${art === 'heart' ? `<path d="M160 128 q-7 -9 -14 -2 q-6 6 14 18 q20 -12 14 -18 q-7 -7 -14 2" fill="#f3e2cf"/>` : ''}
${art === 'leaf' ? `<path d="M160 122 q10 8 0 24 q-10 -16 0 -24" fill="#f3e2cf"/>` : ''}
${art === 'swirl' ? `<path d="M136 132 q24 -10 48 0" stroke="#f3e2cf" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}
${tag ? `<path d="M208 140 q26 24 22 58" stroke="#a08c78" stroke-width="3" fill="none"/>
<rect x="218" y="196" width="26" height="34" rx="4" fill="${tag}" stroke="#00000022" stroke-width="2"/>` : ''}`;
}

// Tall glass with straw (cold drinks)
function glass({ top = '#8a5a3b', bottom = '#c99b6e', cream = false, straw = '#3d6bb3', garnish = '' }) {
  return `
<defs><linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
<rect x="196" y="52" width="10" height="120" rx="5" fill="${straw}" transform="rotate(14 201 112)"/>
<path d="M112 96 L126 252 q1 12 14 12 h40 q13 0 14 -12 L208 96 Z" fill="#ffffff55" stroke="#b8c9dd" stroke-width="4"/>
<path d="M118 130 L129 248 q1 8 11 8 h40 q10 0 11 -8 L220 130 Z" fill="url(#liq)" transform="translate(-5 0) scale(0.97)" opacity="0.92"/>
${cream ? `<path d="M114 110 q22 -26 46 -6 q24 -20 46 6 l-4 22 H118 Z" fill="#fff7ef" stroke="#e8d9c8" stroke-width="3"/>` : ''}
<rect x="128" y="150" width="24" height="24" rx="6" fill="#ffffff88" transform="rotate(-12 140 162)"/>
<rect x="158" y="186" width="22" height="22" rx="6" fill="#ffffff77" transform="rotate(10 169 197)"/>
${garnish}`;
}

const lemonSlice = `<g transform="translate(206 96)"><circle r="20" fill="#f9e076" stroke="#e3b830" stroke-width="3"/>
<path d="M0 -20 A20 20 0 0 1 20 0 L0 0 Z" fill="#fdf3c0"/></g>`;
const blueberries = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#4f6b9e"/><circle cx="${x+16}" cy="${y+6}" r="8" fill="#3d5685"/><circle cx="${x+4}" cy="${y+14}" r="7" fill="#5d7cb0"/>`;

// ---------- bakery & dessert shapes ----------

const croissant = `
<g transform="translate(160 190)">
<path d="M-110 10 q-14 -34 22 -44 q18 -40 66 -28 q52 -14 74 26 q30 16 12 48 q-20 26 -44 12 q-26 20 -62 8 q-40 10 -68 -22" fill="#e0a04f" stroke="#b97b2e" stroke-width="4"/>
<path d="M-64 -34 q-8 34 10 52 M-14 -52 q-4 44 8 62 M42 -44 q8 36 -2 56" stroke="#b97b2e" stroke-width="4" fill="none" stroke-linecap="round"/>
</g>`;

const muffin = `
<g transform="translate(160 170)">
<path d="M-62 10 h124 l-14 76 q-2 12 -14 12 h-68 q-12 0 -14 -12 Z" fill="#e8c288" stroke="#c49a55" stroke-width="4"/>
<path d="M-50 12 L-40 96 M-20 12 L-15 98 M12 12 L16 98 M42 12 L34 96" stroke="#c49a55" stroke-width="3" fill="none"/>
<path d="M-70 12 q-16 -50 30 -52 q6 -30 44 -22 q36 -8 42 24 q34 8 18 50 Z" fill="#d9a55e" stroke="#b97b2e" stroke-width="4"/>
<circle cx="-28" cy="-16" r="8" fill="#4f6b9e"/><circle cx="8" cy="-30" r="8" fill="#3d5685"/><circle cx="36" cy="-8" r="7" fill="#5d7cb0"/><circle cx="-2" cy="0" r="7" fill="#4f6b9e"/>
</g>`;

const cinnamonRoll = `
<g transform="translate(160 178)">
<ellipse cx="0" cy="46" rx="86" ry="20" fill="#d9a55e" stroke="#b97b2e" stroke-width="4"/>
<circle r="70" cy="-6" fill="#e0b06a" stroke="#b97b2e" stroke-width="4"/>
<path d="M-58 -6 a58 58 0 0 1 116 0 a44 44 0 0 1 -88 6 a30 30 0 0 1 60 -4 a16 16 0 0 0 -32 2" fill="none" stroke="#a5732c" stroke-width="8" stroke-linecap="round"/>
<path d="M-46 -34 q46 -22 92 0 q10 24 -6 30 q-40 -18 -80 0 q-16 -6 -6 -30" fill="#fdf6ec" opacity="0.9"/>
</g>`;

const bagel = `
<g transform="translate(160 176)">
<ellipse cx="0" cy="42" rx="84" ry="18" fill="#000000" opacity="0.06"/>
<circle r="74" fill="#dfa557" stroke="#b97b2e" stroke-width="4"/>
<circle r="26" fill="#f5e3cd" stroke="#b97b2e" stroke-width="4"/>
<g fill="#faf3e3" stroke="#c9a25e" stroke-width="1">
<ellipse cx="-40" cy="-38" rx="7" ry="3" transform="rotate(40 -40 -38)"/><ellipse cx="6" cy="-56" rx="7" ry="3"/>
<ellipse cx="46" cy="-32" rx="7" ry="3" transform="rotate(-35 46 -32)"/><ellipse cx="-56" cy="6" rx="7" ry="3" transform="rotate(80 -56 6)"/>
<ellipse cx="60" cy="14" rx="7" ry="3" transform="rotate(70 60 14)"/><ellipse cx="-30" cy="46" rx="7" ry="3" transform="rotate(-40 -30 46)"/>
<ellipse cx="28" cy="50" rx="7" ry="3" transform="rotate(30 28 50)"/>
</g></g>`;

const cheesecake = `
<g transform="translate(160 186)">
<path d="M-84 44 L84 44 L84 30 L0 -64 L-84 30 Z" fill="#f7e8c8" stroke="#d9b980" stroke-width="4"/>
<path d="M-84 44 L84 44 L84 58 q0 8 -10 8 h-148 q-10 0 -10 -8 Z" fill="#c99b56" stroke="#a87b38" stroke-width="4"/>
<path d="M0 -64 L84 30 L84 44 L-84 44 L-84 30 Z" fill="none"/>
<path d="M0 -60 q30 18 24 44 q22 -4 34 18" fill="none" stroke="#7c5cad" stroke-width="0"/>
${blueberries(-16, -34)}
<path d="M-2 -70 q26 30 8 44 q30 -2 40 22 l-46 12 Z" fill="#7d95c4" opacity="0.55"/>
</g>`;

const tiramisu = `
<g transform="translate(160 182)">
<path d="M-78 -46 h156 v92 q0 10 -10 10 h-136 q-10 0 -10 -10 Z" fill="#8a5a3b" stroke="#6d432a" stroke-width="4"/>
<rect x="-78" y="-18" width="156" height="22" fill="#f3e6d0"/>
<rect x="-78" y="22" width="156" height="20" fill="#f3e6d0"/>
<rect x="-78" y="-46" width="156" height="18" rx="4" fill="#5d3b24"/>
<circle cx="34" cy="-58" r="4" fill="#5d3b24"/><circle cx="50" cy="-52" r="3" fill="#5d3b24"/><circle cx="18" cy="-54" r="3" fill="#5d3b24"/>
<path d="M-60 -58 q10 -14 20 0 q-10 8 -20 0" fill="#3f7a3f"/>
</g>`;

const affogato = `
<g transform="translate(160 178)">
<path d="M-64 -60 q64 26 128 0 l-22 108 q-2 12 -14 12 h-56 q-12 0 -14 -12 Z" fill="#ffffff66" stroke="#c9b8a6" stroke-width="4"/>
<path d="M-48 -20 q48 20 96 0 l-14 66 q-2 10 -12 10 h-44 q-10 0 -12 -10 Z" fill="#6d432a" opacity="0.9"/>
<circle cx="0" cy="-40" r="38" fill="#fdf6ec" stroke="#e3d2ba" stroke-width="4"/>
<path d="M-24 -52 q10 -10 20 0 q10 -10 18 2" stroke="#e3d2ba" stroke-width="3" fill="none"/>
<path d="M-70 -74 q20 26 26 8 M70 -74 q-20 26 -26 8" stroke="#8a5a3b" stroke-width="6" fill="none" stroke-linecap="round"/>
</g>`;

const lemonTart = `
<g transform="translate(160 180)">
<ellipse cx="0" cy="46" rx="88" ry="18" fill="#000000" opacity="0.06"/>
<circle r="76" fill="#f0d264" stroke="#d9b23a" stroke-width="4"/>
<circle r="76" fill="none" stroke="#c9964a" stroke-width="10" stroke-dasharray="14 10"/>
<circle r="58" fill="#f9e076"/>
<circle cx="20" cy="-16" r="16" fill="#fdf3c0" opacity="0.8"/>
<path d="M-34 20 q-12 -18 8 -24 q2 -16 20 -12" fill="none" stroke="#3f7a3f" stroke-width="5" stroke-linecap="round"/>
${blueberries(-24, -20)}
</g>`;

// ---------- per-item recipes ----------

const ITEMS = {
  'Espresso':            wrap('Hot Drinks',  cup({ liquid: '#4a2f1d', art: 'swirl' })),
  'Americano':           wrap('Hot Drinks',  cup({ liquid: '#5d3b24' })),
  'Cappuccino':          wrap('Hot Drinks',  cup({ liquid: '#c99b6e', art: 'heart' })),
  'Flat White':          wrap('Hot Drinks',  cup({ liquid: '#d9b48f', art: 'leaf' })),
  'Caramel Latte':       wrap('Hot Drinks',  cup({ liquid: '#b97f4a', art: 'swirl' })),
  'Mocha':               wrap('Hot Drinks',  cup({ liquid: '#6d432a', art: 'heart' })),
  'Iced Latte':          wrap('Cold Drinks', glass({ top: '#f0e3d3', bottom: '#b98a5c', straw: '#3d6bb3' })),
  'Cold Brew':           wrap('Cold Drinks', glass({ top: '#5d3b24', bottom: '#8a5a3b', straw: '#22354f' })),
  'Iced Mocha':          wrap('Cold Drinks', glass({ top: '#7a4a2e', bottom: '#a5734a', cream: true, straw: '#8a4a6b' })),
  'Blueberry Frappe':    wrap('Cold Drinks', glass({ top: '#7d95c4', bottom: '#5d7cb0', cream: true, straw: '#38507c', garnish: blueberries(196, 84) })),
  'Espresso Tonic':      wrap('Cold Drinks', glass({ top: '#e8f0dc', bottom: '#8a5a3b', straw: '#3f7a3f', garnish: lemonSlice })),
  'Earl Grey':           wrap('Tea',         cup({ liquid: '#a5622e', tag: '#c2703d', steamCol: '#a9b8a0' })),
  'Matcha Latte':        wrap('Tea',         cup({ liquid: '#7fae62', art: 'leaf', steamCol: '#a9b8a0' })),
  'Chai Latte':          wrap('Tea',         cup({ liquid: '#b9824f', art: 'swirl', steamCol: '#a9b8a0' })),
  'Jasmine Green Tea':   wrap('Tea',         cup({ liquid: '#b5c46a', tag: '#7fae62', steamCol: '#a9b8a0' })),
  'London Fog':          wrap('Tea',         cup({ liquid: '#c7ad8f', art: 'heart', steamCol: '#a9b8a0' })),
  'Butter Croissant':    wrap('Bakery',      croissant),
  'Blueberry Muffin':    wrap('Bakery',      muffin),
  'Cinnamon Roll':       wrap('Bakery',      cinnamonRoll),
  'Sesame Bagel':        wrap('Bakery',      bagel),
  'Blueberry Cheesecake':wrap('Dessert',     cheesecake),
  'Tiramisu':            wrap('Dessert',     tiramisu),
  'Affogato':            wrap('Dessert',     affogato),
  'Lemon Tart':          wrap('Dessert',     lemonTart)
};

for (const [name, svg] of Object.entries(ITEMS)) {
  fs.writeFileSync(path.join(OUT, `${slug(name)}.svg`), svg.trim());
}

// ---------- hero banner ----------

const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#1a2d4a"/><stop offset="0.55" stop-color="#2e5090"/><stop offset="1" stop-color="#4a6cae"/>
</linearGradient>
</defs>
<rect width="1200" height="340" rx="24" fill="url(#sky)"/>
<g opacity="0.16" fill="#ffffff">
<circle cx="1050" cy="60" r="130"/><circle cx="150" cy="300" r="170"/>
</g>
<g opacity="0.5">
<circle cx="1010" cy="240" r="16" fill="#7d95c4"/><circle cx="1044" cy="252" r="13" fill="#93a9d1"/><circle cx="1022" cy="270" r="11" fill="#6b84b5"/>
<path d="M1008 222 q10 -16 24 -12 q-4 16 -24 12" fill="#7fae62"/>
</g>
<g transform="translate(880 88)" opacity="0.95">
<ellipse cx="60" cy="176" rx="88" ry="12" fill="#000000" opacity="0.19"/>
<path d="M-10 60 L4 160 q2 12 18 12 h76 q16 0 18 -12 L130 60 Z" fill="#f5efe6"/>
<path d="M128 76 q36 -4 36 26 q0 30 -42 28" fill="none" stroke="#f5efe6" stroke-width="9" stroke-linecap="round"/>
<ellipse cx="60" cy="62" rx="70" ry="15" fill="#8a5a3b"/>
<path d="M60 58 q-8 -10 -16 -2 q-6 7 16 19 q22 -12 16 -19 q-8 -8 -16 2" fill="#e8d9c8"/>
<path d="M34 30 q-9 -15 0 -28 q9 -13 0 -26 M86 34 q-9 -15 0 -28 q9 -13 0 -24" stroke="#c9d4e6" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"/>
</g>
</svg>`;
fs.writeFileSync(path.join(OUT, 'hero.svg'), hero.trim());

console.log(`Wrote ${Object.keys(ITEMS).length} item SVGs + hero.svg -> ${OUT}`);
