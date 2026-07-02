let allItems = [];

fetch('/api/drinks')
  .then(res => res.json())
  .then(data => {
    allItems = data;
    renderCards(allItems);
  });

function renderCards(items) {
  const container = document.getElementById('cards');
  const count = document.getElementById('count');
  container.innerHTML = '';
  count.textContent = `Showing ${items.length} items`;

  if (items.length === 0) {
    container.innerHTML = '<p>No items found.</p>';
    return;
  }

  let table = `
    <table border="1" cellpadding="8" cellspacing="0">
      <tr>
        <th>Order ID</th>
        <th>Name</th>
        <th>Category</th>
        <th>Size</th>
        <th>Price</th>
        <th>Type</th>
      </tr>`;

  items.forEach(item => {
    table += `
      <tr>
        <td>${item.order_id}</td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.size}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>${item.order_type}</td>
      </tr>`;
  });

  table += `</table>`;
  container.innerHTML = table;
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const sortValue = document.getElementById('sortSelect').value;

  let filtered = allItems.filter(item =>
    item.name.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );

  if (sortValue === 'nameAsc')  filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sortValue === 'nameDesc') filtered.sort((a, b) => b.name.localeCompare(a.name));
  if (sortValue === 'idAsc')    filtered.sort((a, b) => a.order_id.localeCompare(b.order_id));
  if (sortValue === 'idDesc')   filtered.sort((a, b) => b.order_id.localeCompare(a.order_id));

  renderCards(filtered);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('sortSelect').addEventListener('change', applyFilters);
document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('sortSelect').value = '';
  renderCards(allItems);
});
