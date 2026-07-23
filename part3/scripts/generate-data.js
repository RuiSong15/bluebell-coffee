// =============================================
// Bluebell Coffee – scripts/generate-data.js
// Generates a fresh dataset (same structure as Part 2's drinks.json).
// Usage: node scripts/generate-data.js
// =============================================

const fs = require('fs');
const path = require('path');

// 24 menu items across 5 categories
const MENU = [
  // Hot Drinks
  { name: 'Espresso',            category: 'Hot Drinks', sku: 'HOT-ESP', base: 2.45, pop: 88, ingredients: ['Espresso beans'] },
  { name: 'Americano',           category: 'Hot Drinks', sku: 'HOT-AME', base: 2.95, pop: 76, ingredients: ['Espresso beans', 'Hot water'] },
  { name: 'Cappuccino',          category: 'Hot Drinks', sku: 'HOT-CAP', base: 3.95, pop: 91, ingredients: ['Espresso beans', 'Steamed milk', 'Milk foam'] },
  { name: 'Flat White',          category: 'Hot Drinks', sku: 'HOT-FLW', base: 4.15, pop: 72, ingredients: ['Espresso beans', 'Microfoam milk'] },
  { name: 'Caramel Latte',       category: 'Hot Drinks', sku: 'HOT-CLT', base: 4.65, pop: 85, ingredients: ['Espresso beans', 'Steamed milk', 'Caramel syrup'] },
  { name: 'Mocha',               category: 'Hot Drinks', sku: 'HOT-MOC', base: 4.45, pop: 79, ingredients: ['Espresso beans', 'Steamed milk', 'Chocolate'] },
  // Cold Drinks
  { name: 'Iced Latte',          category: 'Cold Drinks', sku: 'CLD-ILT', base: 4.25, pop: 90, ingredients: ['Espresso beans', 'Cold milk', 'Ice'] },
  { name: 'Cold Brew',           category: 'Cold Drinks', sku: 'CLD-CBR', base: 3.95, pop: 82, ingredients: ['Cold brew coffee', 'Ice'] },
  { name: 'Iced Mocha',          category: 'Cold Drinks', sku: 'CLD-IMO', base: 4.75, pop: 71, ingredients: ['Espresso beans', 'Milk', 'Chocolate', 'Ice'] },
  { name: 'Blueberry Frappe',    category: 'Cold Drinks', sku: 'CLD-BFR', base: 5.45, pop: 87, ingredients: ['Blueberries', 'Milk', 'Ice', 'Whipped cream'] },
  { name: 'Espresso Tonic',      category: 'Cold Drinks', sku: 'CLD-ETO', base: 4.95, pop: 58, ingredients: ['Espresso beans', 'Tonic water', 'Ice', 'Lemon'] },
  // Tea
  { name: 'Earl Grey',           category: 'Tea', sku: 'TEA-EGR', base: 2.95, pop: 64, ingredients: ['Earl grey tea', 'Hot water'] },
  { name: 'Matcha Latte',        category: 'Tea', sku: 'TEA-MLT', base: 4.85, pop: 89, ingredients: ['Matcha powder', 'Steamed milk'] },
  { name: 'Chai Latte',          category: 'Tea', sku: 'TEA-CHA', base: 4.55, pop: 77, ingredients: ['Chai spices', 'Black tea', 'Steamed milk'] },
  { name: 'Jasmine Green Tea',   category: 'Tea', sku: 'TEA-JGT', base: 3.15, pop: 61, ingredients: ['Jasmine green tea', 'Hot water'] },
  { name: 'London Fog',          category: 'Tea', sku: 'TEA-LFG', base: 4.35, pop: 66, ingredients: ['Earl grey tea', 'Steamed milk', 'Vanilla syrup'] },
  // Bakery
  { name: 'Butter Croissant',    category: 'Bakery', sku: 'BAK-CRO', base: 3.25, pop: 92, ingredients: ['Flour', 'Butter', 'Yeast'] },
  { name: 'Blueberry Muffin',    category: 'Bakery', sku: 'BAK-BMU', base: 3.45, pop: 84, ingredients: ['Flour', 'Blueberries', 'Sugar', 'Butter'] },
  { name: 'Cinnamon Roll',       category: 'Bakery', sku: 'BAK-CIN', base: 3.95, pop: 81, ingredients: ['Flour', 'Cinnamon', 'Sugar', 'Cream cheese icing'] },
  { name: 'Sesame Bagel',        category: 'Bakery', sku: 'BAK-BGL', base: 2.85, pop: 68, ingredients: ['Flour', 'Sesame seeds', 'Cream cheese'] },
  // Dessert
  { name: 'Blueberry Cheesecake',category: 'Dessert', sku: 'DES-BCH', base: 5.95, pop: 93, ingredients: ['Cream cheese', 'Blueberries', 'Biscuit base'] },
  { name: 'Tiramisu',            category: 'Dessert', sku: 'DES-TIR', base: 5.75, pop: 86, ingredients: ['Mascarpone', 'Espresso', 'Ladyfingers', 'Cocoa'] },
  { name: 'Affogato',            category: 'Dessert', sku: 'DES-AFF', base: 4.95, pop: 74, ingredients: ['Vanilla ice cream', 'Espresso'] },
  { name: 'Lemon Tart',          category: 'Dessert', sku: 'DES-LTA', base: 4.85, pop: 63, ingredients: ['Lemon curd', 'Pastry shell', 'Icing sugar'] }
];

const CUSTOMERS = ['Alex','Bella','Chen','Daniel','Emma','Farah','Grace','Hassan','Ivy','Jack',
  'Kavya','Liam','Mia','Noah','Olivia','Priya','Quinn','Rui','Sofia','Tom',
  'Uma','Victor','Wendy','Xavier','Yuki','Zoe','Amir','Brooke','Carlos','Dina',
  'Ethan','Fiona','George','Hana','Isaac','Julia','Kevin','Lena','Marco','Nina'];

const ORDER_TYPES = ['Takeout', 'Dine-in', 'Delivery'];
const SIZES = ['Small', 'Medium', 'Large'];
const SIZE_DELTA = { Small: -0.4, Medium: 0, Large: 0.6 };

// Deterministic pseudo-random (so the dataset is reproducible)
let seedVal = 20260722;
function rand() {
  seedVal = (seedVal * 1103515245 + 12345) % 2147483648;
  return seedVal / 2147483648;
}
const pick = arr => arr[Math.floor(rand() * arr.length)];

function pad(n, w) { return String(n).padStart(w, '0'); }

function randomDate() {
  const start = new Date('2025-08-01T07:00:00').getTime();
  const end   = new Date('2026-07-20T21:00:00').getTime();
  const d = new Date(start + rand() * (end - start));
  return `${d.getFullYear()}-${pad(d.getMonth()+1,2)}-${pad(d.getDate(),2)} ` +
         `${pad(d.getHours(),2)}:${pad(d.getMinutes(),2)}:${pad(d.getSeconds(),2)}`;
}

const TOTAL = 521;
const records = [];
for (let i = 1; i <= TOTAL; i++) {
  const item = pick(MENU);
  const isFood = item.category === 'Bakery' || item.category === 'Dessert';
  const size = isFood ? 'N/A' : pick(SIZES);
  const price = +(item.base + (isFood ? 0 : SIZE_DELTA[size])).toFixed(2);
  const itemIndex = MENU.indexOf(item) + 1;

  records.push({
    id: `order-${pad(i,3)}`,
    order_id: `ORD${pad(i,3)}`,
    item_id: `It${pad(itemIndex,3)}`,
    name: item.name,
    category: item.category,
    size,
    price,
    quantity: rand() < 0.75 ? 1 : (rand() < 0.7 ? 2 : 3),
    order_type: pick(ORDER_TYPES),
    created_at: randomDate(),
    details: {
      sku: item.sku,
      customer: pick(CUSTOMERS),
      popularity: Math.max(1, item.pop + Math.floor(rand()*11) - 5)
    },
    ingredients: item.ingredients
  });
}

// Sort by created_at so order ids roughly follow time
records.sort((a,b) => a.created_at.localeCompare(b.created_at));
records.forEach((r, idx) => {
  r.id = `order-${pad(idx+1,3)}`;
  r.order_id = `ORD${pad(idx+1,3)}`;
});

const out = path.join(__dirname, '..', 'data', 'drinks.json');
fs.writeFileSync(out, JSON.stringify(records, null, 2));
console.log(`Wrote ${records.length} records, ${MENU.length} distinct items -> ${out}`);
