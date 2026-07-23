// Bluebell Coffee – home page
// Fetches all order records from the API, groups them into unique
// menu items, and renders illustrated cards.

let menuItems = [];

const slugify = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

fetch('/api/drinks')
  .then(res => res.json())
  .then(data => {
    menuItems = groupIntoMenu(data);
    document.getElementById('totalItems').textContent =
      `${menuItems.length} menu items · ${data.length} order records (from Neon PostgreSQL)`;
    renderCards(menuItems);
  })
  .catch(() => {
    document.getElementById('cards').innerHTML =
      '<p class="no-results">Could not load the menu. Is the database connected?</p>';
  });

function groupIntoMenu(records) {
  const map = new Map();
  records.forEach(r => {
    if (!map.has(r.name)) {
      map.set(r.name, {
        name: r.name,
        category: r.category,
        minPrice: r.price,
        maxPrice: r.price,
        popularity: r.popularity ?? (r.details ? r.details.popularity : 0),
        ingredients: r.ingredients || [],
        orders: 0
      });
    }
    const m = map.get(r.name);
    m.minPrice = Math.min(m.minPrice, r.price);
    m.maxPrice = Math.max(m.maxPrice, r.price);
    m.popularity = Math.max(m.popularity, r.popularity ?? 0);
    m.orders += 1;
  });
  return [...map.values()];
}

function priceLabel(item) {
  return item.minPrice === item.maxPrice
    ? `$${item.minPrice.toFixed(2)}`
    : `$${item.minPrice.toFixed(2)} – $${item.maxPrice.toFixed(2)}`;
}

function renderCards(items) {
  const container = document.getElementById('cards');
  const count = document.getElementById('count');
  count.textContent = `Showing ${items.length} items`;

  if (items.length === 0) {
    container.innerHTML = '<p class="no-results">No items found.</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="/images/${slugify(item.name)}.svg" alt="${item.name}" loading="lazy"
           onerror="this.style.display='none'"/>
      <div class="card-body">
        <span class="chip chip-${slugify(item.category)}">${item.category}</span>
        <h4>${item.name}</h4>
        <p class="ingredients">${item.ingredients.join(', ')}</p>
        <div class="card-foot">
          <span class="price">${priceLabel(item)}</span>
          <span class="pop">🔥 ${item.popularity} · ${item.orders} orders</span>
        </div>
      </div>
    </div>`).join('');
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const sortValue = document.getElementById('sortSelect').value;

  let filtered = menuItems.filter(item =>
    item.name.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    item.ingredients.some(i => i.toLowerCase().includes(query))
  );

  if (sortValue === 'nameAsc')   filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sortValue === 'nameDesc')  filtered.sort((a, b) => b.name.localeCompare(a.name));
  if (sortValue === 'priceAsc')  filtered.sort((a, b) => a.minPrice - b.minPrice);
  if (sortValue === 'priceDesc') filtered.sort((a, b) => b.minPrice - a.minPrice);
  if (sortValue === 'popDesc')   filtered.sort((a, b) => b.popularity - a.popularity);

  renderCards(filtered);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('sortSelect').addEventListener('change', applyFilters);
document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('sortSelect').value = '';
  renderCards(menuItems);
});
