const STORAGE_KEY = "sales-system-v2";
const DEFAULT_IGV = 18;

const initialData = {
  igvRate: DEFAULT_IGV,
  clients: [
    { id: crypto.randomUUID(), name: "Cliente Demo", doc: "12345678", email: "cliente@demo.com", image: "" },
  ],
  products: [
    { id: crypto.randomUUID(), name: "Producto Demo", code: "P-001", price: 100, image: "" },
  ],
  invoices: [],
};

const state = loadDb();
const $ = (id) => document.getElementById(id);

const clientForm = $("client-form");
const productForm = $("product-form");
const invoiceForm = $("invoice-form");
const statusEl = $("status");

clientForm.addEventListener("submit", handleClientSubmit);
productForm.addEventListener("submit", handleProductSubmit);
invoiceForm.addEventListener("submit", handleInvoiceSubmit);
$("invoice-product").addEventListener("change", syncSelectedProductPrice);
$("invoice-qty").addEventListener("input", recalcTotals);
$("invoice-unit-price").addEventListener("input", recalcTotals);
$("igv-rate").addEventListener("input", handleIgvChange);
$("client-cancel").addEventListener("click", resetClientForm);
$("product-cancel").addEventListener("click", resetProductForm);
$("btn-export").addEventListener("click", exportDb);
$("btn-import").addEventListener("change", importDb);
$("btn-reset").addEventListener("click", resetDb);

renderAll();

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialData);

  try {
    const parsed = JSON.parse(raw);
    return {
      igvRate: Number(parsed.igvRate ?? DEFAULT_IGV),
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    };
  } catch {
    return structuredClone(initialData);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showStatus(message, kind = "ok") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

async function fileToDataUrl(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleClientSubmit(event) {
  event.preventDefault();
  const id = $("client-id").value || crypto.randomUUID();
  const existing = state.clients.find((client) => client.id === id);
  const image = (await fileToDataUrl($("client-image"))) ?? existing?.image ?? "";

  const record = {
    id,
    name: $("client-name").value.trim(),
    doc: $("client-doc").value.trim(),
    email: $("client-email").value.trim(),
    image,
  };

  if (!record.name || !record.doc || !record.email) {
    showStatus("Completa todos los campos del cliente.", "error");
    return;
  }

  upsert(state.clients, record);
  resetClientForm();
  persist();
  renderAll();
  showStatus("Cliente guardado correctamente.");
}

async function handleProductSubmit(event) {
  event.preventDefault();
  const id = $("product-id").value || crypto.randomUUID();
  const existing = state.products.find((product) => product.id === id);
  const image = (await fileToDataUrl($("product-image"))) ?? existing?.image ?? "";

  const price = Number($("product-price").value);
  const record = {
    id,
    name: $("product-name").value.trim(),
    code: $("product-code").value.trim(),
    price,
    image,
  };

  if (!record.name || !record.code || Number.isNaN(price) || price < 0) {
    showStatus("Verifica los datos del producto.", "error");
    return;
  }

  upsert(state.products, record);
  resetProductForm();
  persist();
  renderAll();
  showStatus("Producto guardado correctamente.");
}

function handleInvoiceSubmit(event) {
  event.preventDefault();

  if (!state.clients.length || !state.products.length) {
    showStatus("Debes tener al menos un cliente y un producto.", "error");
    return;
  }

  const client = state.clients.find((item) => item.id === $("invoice-client").value);
  const product = state.products.find((item) => item.id === $("invoice-product").value);
  const qty = Number($("invoice-qty").value);
  const unitPrice = Number($("invoice-unit-price").value);

  if (!client || !product || qty <= 0 || unitPrice < 0 || Number.isNaN(qty) || Number.isNaN(unitPrice)) {
    showStatus("Verifica cliente, producto, cantidad y precio.", "error");
    return;
  }

  const summary = calculateTotals(qty, unitPrice, state.igvRate);

  state.invoices.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    clientName: client.name,
    productName: product.name,
    qty,
    unitPrice,
    igvRate: state.igvRate,
    ...summary,
  });

  invoiceForm.reset();
  $("invoice-qty").value = "1";
  $("igv-rate").value = String(state.igvRate);
  syncSelectedProductPrice();
  persist();
  renderInvoices();
  showStatus("Venta registrada correctamente.");
}

function handleIgvChange() {
  const parsed = Number($("igv-rate").value);
  if (Number.isNaN(parsed) || parsed < 0) return;
  state.igvRate = parsed;
  persist();
  recalcTotals();
}

function upsert(list, record) {
  const index = list.findIndex((item) => item.id === record.id);
  if (index >= 0) list[index] = record;
  else list.unshift(record);
}

function renderAll() {
  $("igv-rate").value = String(state.igvRate);
  renderClients();
  renderProducts();
  renderSelectors();
  syncSelectedProductPrice();
  renderInvoices();
}

function buildCard({ image, lines, onEdit, onDelete }) {
  const node = $("card-template").content.cloneNode(true);
  const img = node.querySelector(".thumb");
  const content = node.querySelector(".content");

  img.src = image || "https://placehold.co/420x200?text=Sin+imagen";

  lines.forEach((line, idx) => {
    const el = document.createElement(idx === 0 ? "strong" : "span");
    el.textContent = line;
    content.appendChild(el);
  });

  const actions = document.createElement("div");
  actions.className = "actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.textContent = "Editar";
  editBtn.addEventListener("click", onEdit);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Eliminar";
  removeBtn.addEventListener("click", onDelete);

  actions.append(editBtn, removeBtn);
  content.appendChild(actions);
  return node;
}

function renderClients() {
  const container = $("client-list");
  container.innerHTML = "";

  state.clients.forEach((client) => {
    const card = buildCard({
      image: client.image,
      lines: [client.name, `DNI/RUC: ${client.doc}`, client.email],
      onEdit: () => fillClientForm(client),
      onDelete: () => removeClient(client.id),
    });
    container.appendChild(card);
  });
}

function renderProducts() {
  const container = $("product-list");
  container.innerHTML = "";

  state.products.forEach((product) => {
    const card = buildCard({
      image: product.image,
      lines: [product.name, `Código: ${product.code}`, `Precio: S/. ${format(product.price)}`],
      onEdit: () => fillProductForm(product),
      onDelete: () => removeProduct(product.id),
    });
    container.appendChild(card);
  });
}

function fillClientForm(client) {
  $("client-id").value = client.id;
  $("client-name").value = client.name;
  $("client-doc").value = client.doc;
  $("client-email").value = client.email;
}

function fillProductForm(product) {
  $("product-id").value = product.id;
  $("product-name").value = product.name;
  $("product-code").value = product.code;
  $("product-price").value = String(product.price);
}

function resetClientForm() {
  clientForm.reset();
  $("client-id").value = "";
}

function resetProductForm() {
  productForm.reset();
  $("product-id").value = "";
}

function removeClient(id) {
  state.clients = state.clients.filter((item) => item.id !== id);
  persist();
  renderAll();
  showStatus("Cliente eliminado.");
}

function removeProduct(id) {
  state.products = state.products.filter((item) => item.id !== id);
  persist();
  renderAll();
  showStatus("Producto eliminado.");
}

function renderSelectors() {
  const clientSelect = $("invoice-client");
  const productSelect = $("invoice-product");

  clientSelect.innerHTML = state.clients
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
    .join("");

  productSelect.innerHTML = state.products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`)
    .join("");
}

function syncSelectedProductPrice() {
  const product = state.products.find((item) => item.id === $("invoice-product").value);
  $("invoice-unit-price").value = product ? String(product.price) : "0";
  recalcTotals();
}

function calculateTotals(qty, unitPrice, igvRate) {
  const subtotal = qty * unitPrice;
  const igv = subtotal * (igvRate / 100);
  const total = subtotal + igv;
  return { subtotal, igv, total };
}

function recalcTotals() {
  const qty = Number($("invoice-qty").value || 0);
  const unitPrice = Number($("invoice-unit-price").value || 0);
  const summary = calculateTotals(qty, unitPrice, state.igvRate);

  $("subtotal").textContent = `S/. ${format(summary.subtotal)}`;
  $("igv").textContent = `S/. ${format(summary.igv)}`;
  $("total").textContent = `S/. ${format(summary.total)}`;
}

function renderInvoices() {
  const container = $("invoice-list");

  if (!state.invoices.length) {
    container.innerHTML = "<p>Aún no hay ventas registradas.</p>";
    return;
  }

  const rows = state.invoices
    .map(
      (invoice) => `
      <tr>
        <td>${new Date(invoice.date).toLocaleString()}</td>
        <td>${escapeHtml(invoice.clientName)}</td>
        <td>${escapeHtml(invoice.productName)}</td>
        <td>${invoice.qty}</td>
        <td>S/. ${format(invoice.unitPrice)}</td>
        <td>S/. ${format(invoice.subtotal)}</td>
        <td>${format(invoice.igvRate)}%</td>
        <td>S/. ${format(invoice.igv)}</td>
        <td><strong>S/. ${format(invoice.total)}</strong></td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Producto</th>
          <th>Cant.</th>
          <th>P. Unit.</th>
          <th>Subtotal</th>
          <th>% IGV</th>
          <th>IGV</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function exportDb() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ventas-db.json";
  link.click();
  URL.revokeObjectURL(url);
  showStatus("Base de datos exportada.");
}

async function importDb(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    state.igvRate = Number(parsed.igvRate ?? DEFAULT_IGV);
    state.clients = Array.isArray(parsed.clients) ? parsed.clients : [];
    state.products = Array.isArray(parsed.products) ? parsed.products : [];
    state.invoices = Array.isArray(parsed.invoices) ? parsed.invoices : [];

    persist();
    renderAll();
    showStatus("Base de datos importada correctamente.");
  } catch {
    showStatus("No se pudo importar el archivo JSON.", "error");
  } finally {
    event.target.value = "";
  }
}

function resetDb() {
  const accepted = confirm("¿Seguro que quieres borrar todos los datos guardados?");
  if (!accepted) return;

  Object.assign(state, structuredClone(initialData));
  persist();
  renderAll();
  resetClientForm();
  resetProductForm();
  showStatus("Base de datos reiniciada.");
}

function format(value) {
  return Number(value || 0).toFixed(2);
}

function escapeHtml(text) {
  const safe = document.createElement("div");
  safe.textContent = String(text);
  return safe.innerHTML;
}
