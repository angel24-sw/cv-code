const IGV_RATE = 0.18;

const db = {
  clients: load("clients", [
    {
      id: crypto.randomUUID(),
      name: "Cliente Demo",
      doc: "12345678",
      email: "cliente@demo.com",
      image: "",
    },
  ]),
  products: load("products", [
    {
      id: crypto.randomUUID(),
      name: "Producto Demo",
      code: "P-001",
      price: 100,
      image: "",
    },
  ]),
  invoices: load("invoices", []),
};

const $ = (id) => document.getElementById(id);

const clientForm = $("client-form");
const productForm = $("product-form");
const invoiceForm = $("invoice-form");

clientForm.addEventListener("submit", handleClientSubmit);
productForm.addEventListener("submit", handleProductSubmit);
invoiceForm.addEventListener("submit", handleInvoiceSubmit);
$("invoice-product").addEventListener("change", syncSelectedProductPrice);
$("invoice-qty").addEventListener("input", recalcTotals);
$("invoice-unit-price").addEventListener("input", recalcTotals);

renderAll();

function load(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function save() {
  localStorage.setItem("clients", JSON.stringify(db.clients));
  localStorage.setItem("products", JSON.stringify(db.products));
  localStorage.setItem("invoices", JSON.stringify(db.invoices));
}

async function fileToDataUrl(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function handleClientSubmit(e) {
  e.preventDefault();
  const id = $("client-id").value || crypto.randomUUID();
  const existing = db.clients.find((c) => c.id === id);
  const image = (await fileToDataUrl($("client-image"))) ?? existing?.image ?? "";
  const record = {
    id,
    name: $("client-name").value,
    doc: $("client-doc").value,
    email: $("client-email").value,
    image,
  };

  upsert(db.clients, record);
  clientForm.reset();
  $("client-id").value = "";
  save();
  renderAll();
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = $("product-id").value || crypto.randomUUID();
  const existing = db.products.find((p) => p.id === id);
  const image = (await fileToDataUrl($("product-image"))) ?? existing?.image ?? "";
  const record = {
    id,
    name: $("product-name").value,
    code: $("product-code").value,
    price: Number($("product-price").value),
    image,
  };

  upsert(db.products, record);
  productForm.reset();
  $("product-id").value = "";
  save();
  renderAll();
}

function handleInvoiceSubmit(e) {
  e.preventDefault();
  const product = db.products.find((p) => p.id === $("invoice-product").value);
  const client = db.clients.find((c) => c.id === $("invoice-client").value);
  const qty = Number($("invoice-qty").value);
  const unitPrice = Number($("invoice-unit-price").value);
  const subtotal = qty * unitPrice;
  const igv = subtotal * IGV_RATE;
  const total = subtotal + igv;

  db.invoices.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    clientName: client?.name ?? "Sin cliente",
    productName: product?.name ?? "Sin producto",
    qty,
    unitPrice,
    subtotal,
    igv,
    total,
  });

  invoiceForm.reset();
  $("invoice-qty").value = "1";
  syncSelectedProductPrice();
  save();
  renderInvoices();
}

function upsert(list, record) {
  const idx = list.findIndex((item) => item.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);
}

function renderAll() {
  renderClients();
  renderProducts();
  renderSelectors();
  syncSelectedProductPrice();
  renderInvoices();
}

function renderClients() {
  const container = $("client-list");
  container.innerHTML = "";

  db.clients.forEach((client) => {
    const card = buildCard(
      client.image,
      `<strong>${client.name}</strong><span>DNI/RUC: ${client.doc}</span><span>${client.email}</span>`,
      () => fillClientForm(client),
      () => removeClient(client.id)
    );
    container.append(card);
  });
}

function renderProducts() {
  const container = $("product-list");
  container.innerHTML = "";

  db.products.forEach((product) => {
    const card = buildCard(
      product.image,
      `<strong>${product.name}</strong><span>Código: ${product.code}</span><span>Precio: S/. ${format(product.price)}</span>`,
      () => fillProductForm(product),
      () => removeProduct(product.id)
    );
    container.append(card);
  });
}

function buildCard(image, contentHtml, onEdit, onDelete) {
  const tpl = $("card-template").content.cloneNode(true);
  const img = tpl.querySelector(".thumb");
  img.src = image || "https://placehold.co/420x200?text=Sin+imagen";

  const content = tpl.querySelector(".content");
  content.innerHTML = contentHtml;

  const actions = document.createElement("div");
  actions.className = "actions";
  const edit = document.createElement("button");
  edit.textContent = "Editar";
  edit.onclick = onEdit;
  const del = document.createElement("button");
  del.textContent = "Eliminar";
  del.onclick = onDelete;
  actions.append(edit, del);
  content.append(actions);

  return tpl;
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
  $("product-price").value = product.price;
}

function removeClient(id) {
  db.clients = db.clients.filter((c) => c.id !== id);
  save();
  renderAll();
}

function removeProduct(id) {
  db.products = db.products.filter((p) => p.id !== id);
  save();
  renderAll();
}

function renderSelectors() {
  const clientSel = $("invoice-client");
  const productSel = $("invoice-product");

  clientSel.innerHTML = db.clients.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  productSel.innerHTML = db.products.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}

function syncSelectedProductPrice() {
  const product = db.products.find((p) => p.id === $("invoice-product").value);
  $("invoice-unit-price").value = product ? product.price : 0;
  recalcTotals();
}

function recalcTotals() {
  const qty = Number($("invoice-qty").value || 0);
  const unitPrice = Number($("invoice-unit-price").value || 0);
  const subtotal = qty * unitPrice;
  const igv = subtotal * IGV_RATE;
  const total = subtotal + igv;

  $("subtotal").textContent = `S/. ${format(subtotal)}`;
  $("igv").textContent = `S/. ${format(igv)}`;
  $("total").textContent = `S/. ${format(total)}`;
}

function renderInvoices() {
  const container = $("invoice-list");
  if (!db.invoices.length) {
    container.innerHTML = "<p>Aún no hay ventas registradas.</p>";
    return;
  }

  const rows = db.invoices
    .map(
      (inv) => `
      <tr>
        <td>${new Date(inv.date).toLocaleString()}</td>
        <td>${inv.clientName}</td>
        <td>${inv.productName}</td>
        <td>${inv.qty}</td>
        <td>S/. ${format(inv.unitPrice)}</td>
        <td>S/. ${format(inv.subtotal)}</td>
        <td>S/. ${format(inv.igv)}</td>
        <td><strong>S/. ${format(inv.total)}</strong></td>
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
          <th>IGV</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function format(value) {
  return Number(value).toFixed(2);
}
