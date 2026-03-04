const STORAGE_KEY = 'svi-products';

const form = document.querySelector('#product-form');
const tbody = document.querySelector('#products-body');
const clearBtn = document.querySelector('#clear-btn');
const template = document.querySelector('#row-template');

const totalProducts = document.querySelector('#total-products');
const totalStock = document.querySelector('#total-stock');
const inventoryValue = document.querySelector('#inventory-value');

let products = loadProducts();

render();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const product = {
    id: crypto.randomUUID(),
    name: String(data.get('name')).trim(),
    sku: String(data.get('sku')).trim(),
    category: String(data.get('category')).trim(),
    price: Number(data.get('price') || 0),
    stock: Number(data.get('stock') || 0),
  };

  if (!product.name || !product.sku || !product.category) {
    return;
  }

  products.unshift(product);
  persistProducts();
  render();
  form.reset();
});

clearBtn.addEventListener('click', () => {
  products = [];
  persistProducts();
  render();
});

tbody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;

  const id = button.dataset.id;
  products = products.filter((item) => item.id !== id);
  persistProducts();
  render();
});

function loadProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function render() {
  tbody.innerHTML = '';

  for (const product of products) {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector('[data-col="name"]').textContent = product.name;
    fragment.querySelector('[data-col="sku"]').textContent = product.sku;
    fragment.querySelector('[data-col="category"]').textContent = product.category;
    fragment.querySelector('[data-col="price"]').textContent = formatMoney(product.price);
    fragment.querySelector('[data-col="stock"]').textContent = String(product.stock);
    fragment.querySelector('[data-action="delete"]').dataset.id = product.id;
    tbody.appendChild(fragment);
  }

  const stock = products.reduce((acc, item) => acc + Number(item.stock), 0);
  const value = products.reduce((acc, item) => acc + Number(item.stock) * Number(item.price), 0);

  totalProducts.textContent = String(products.length);
  totalStock.textContent = String(stock);
  inventoryValue.textContent = formatMoney(value);
}

function formatMoney(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(amount) || 0);
}
