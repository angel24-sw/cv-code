const STORAGE_KEY = "sales-system-v4";
const SESSION_KEY = "sales-session-v1";
const DEFAULT_IGV = 18;
const USERS = [{ username: "admin", password: "123456", name: "Administrador" }];

const initialData = {
  igvRate: DEFAULT_IGV,
  clients: [{ id: crypto.randomUUID(), name: "Cliente Demo", doc: "12345678", email: "cliente@demo.com", image: "" }],
  products: [{ id: crypto.randomUUID(), name: "Producto Demo", code: "P-001", price: 100, image: "" }],
  invoices: [],
  quotes: [],
};

const state = loadDb();
const quoteDraft = { items: [] };
const $ = (id) => document.getElementById(id);

const loginForm = $("login-form");
const appMain = $("app-main");
const loginPanel = $("login-panel");
const logoutBtn = $("logout-btn");
const sessionUser = $("session-user");

const clientForm = $("client-form");
const productForm = $("product-form");
const invoiceForm = $("invoice-form");
const quoteItemForm = $("quote-item-form");
const statusEl = $("status");

loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", logout);

clientForm.addEventListener("submit", handleClientSubmit);
productForm.addEventListener("submit", handleProductSubmit);
invoiceForm.addEventListener("submit", handleInvoiceSubmit);
quoteItemForm.addEventListener("submit", handleAddQuoteItem);
$("invoice-product").addEventListener("change", syncSelectedProductPrice);
$("invoice-qty").addEventListener("input", recalcTotals);
$("invoice-unit-price").addEventListener("input", recalcTotals);
$("igv-rate").addEventListener("input", handleIgvChange);
$("quote-product").addEventListener("change", syncQuoteProductPrice);
$("client-cancel").addEventListener("click", resetClientForm);
$("product-cancel").addEventListener("click", resetProductForm);
$("quote-clear-items").addEventListener("click", clearQuoteItems);
$("quote-save").addEventListener("click", saveQuote);
$("quote-print").addEventListener("click", printQuote);
$("btn-export").addEventListener("click", exportDb);
$("btn-import").addEventListener("change", importDb);
$("btn-reset").addEventListener("click", resetDb);

initSession();

function initSession() {
  const user = loadSession();
  if (user) {
    showApp(user);
    renderAll();
    return;
  }
  showLogin();
}

function handleLogin(event) {
  event.preventDefault();
  const username = $("login-user").value.trim();
  const password = $("login-pass").value;
  const found = USERS.find((u) => u.username === username && u.password === password);
  if (!found) {
    showStatus("Usuario o contraseña incorrectos.", "error");
    return;
  }
  saveSession({ username: found.username, name: found.name });
  showApp({ username: found.username, name: found.name });
  renderAll();
  loginForm.reset();
  showStatus(`Bienvenido, ${found.name}.`);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
  showStatus("Sesión cerrada.");
}

function showApp(user) {
  loginPanel.classList.add("hidden");
  appMain.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  sessionUser.textContent = `Usuario: ${user.name}`;
}

function showLogin() {
  loginPanel.classList.remove("hidden");
  appMain.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  sessionUser.textContent = "";
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    };
  } catch {
    return structuredClone(initialData);
  }
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function showStatus(message, kind = "ok") { statusEl.textContent = message; statusEl.className = `status ${kind}`; }

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
  const existing = state.clients.find((c) => c.id === id);
  const image = (await fileToDataUrl($("client-image"))) ?? existing?.image ?? "";
  const record = { id, name: $("client-name").value.trim(), doc: $("client-doc").value.trim(), email: $("client-email").value.trim(), image };
  if (!record.name || !record.doc || !record.email) return showStatus("Completa datos de cliente.", "error");
  upsert(state.clients, record); resetClientForm(); persist(); renderAll(); showStatus("Cliente guardado.");
}

async function handleProductSubmit(event) {
  event.preventDefault();
  const id = $("product-id").value || crypto.randomUUID();
  const existing = state.products.find((p) => p.id === id);
  const image = (await fileToDataUrl($("product-image"))) ?? existing?.image ?? "";
  const price = Number($("product-price").value);
  const record = { id, name: $("product-name").value.trim(), code: $("product-code").value.trim(), price, image };
  if (!record.name || !record.code || Number.isNaN(price) || price < 0) return showStatus("Producto inválido.", "error");
  upsert(state.products, record); resetProductForm(); persist(); renderAll(); showStatus("Producto guardado.");
}

function handleInvoiceSubmit(event) {
  event.preventDefault();
  const client = state.clients.find((c) => c.id === $("invoice-client").value);
  const product = state.products.find((p) => p.id === $("invoice-product").value);
  const qty = Number($("invoice-qty").value);
  const unitPrice = Number($("invoice-unit-price").value);
  if (!client || !product || qty <= 0 || unitPrice < 0) return showStatus("Datos de venta inválidos.", "error");
  const summary = calculateTotals(qty, unitPrice, state.igvRate);
  state.invoices.unshift({ id: crypto.randomUUID(), date: new Date().toISOString(), clientName: client.name, productName: product.name, qty, unitPrice, igvRate: state.igvRate, ...summary });
  persist(); invoiceForm.reset(); $("invoice-qty").value = "1"; $("igv-rate").value = String(state.igvRate); syncSelectedProductPrice(); renderInvoices(); showStatus("Venta registrada.");
}

function handleAddQuoteItem(event) {
  event.preventDefault();
  const product = state.products.find((p) => p.id === $("quote-product").value);
  const qty = Number($("quote-qty").value);
  const unitPrice = Number($("quote-unit-price").value);
  const discount = Number($("quote-discount").value || 0);
  if (!product || qty <= 0 || unitPrice < 0 || discount < 0) return showStatus("Ítem de cotización inválido.", "error");
  quoteDraft.items.push({ id: crypto.randomUUID(), code: product.code, description: product.name, qty, unitPrice, discount, lineTotal: qty * unitPrice - discount });
  quoteItemForm.reset(); $("quote-qty").value = "1"; $("quote-discount").value = "0"; syncQuoteProductPrice(); renderQuoteDraft(); showStatus("Ítem agregado a la cotización.");
}

function saveQuote() {
  const client = state.clients.find((c) => c.id === $("quote-client").value);
  if (!client || !quoteDraft.items.length) return showStatus("Agrega cliente e ítems para cotizar.", "error");
  const quote = buildQuoteModel(client);
  state.quotes.unshift(quote); persist(); renderQuotePreview(quote); showStatus(`Cotización ${quote.number} guardada.`);
}

function buildQuoteModel(client) {
  const currency = $("quote-currency").value;
  const validDays = Number($("quote-valid-days").value || 7);
  const subtotal = quoteDraft.items.reduce((acc, item) => acc + item.lineTotal, 0);
  const igv = subtotal * (state.igvRate / 100);
  return {
    id: crypto.randomUUID(),
    number: $("quote-number").value.trim() || `COT-${String(state.quotes.length + 1).padStart(4, "0")}`,
    date: new Date().toISOString(),
    validUntil: new Date(Date.now() + validDays * 86400000).toISOString(),
    attention: $("quote-attention").value.trim(),
    notes: $("quote-notes").value.trim(),
    currency,
    igvRate: state.igvRate,
    client,
    items: [...quoteDraft.items],
    subtotal,
    igv,
    total: subtotal + igv,
  };
}

function printQuote() { if (!$("quote-preview").innerHTML.trim()) return showStatus("Primero guarda una cotización.", "error"); window.print(); }
function clearQuoteItems() { quoteDraft.items = []; renderQuoteDraft(); showStatus("Ítems de cotización limpiados."); }
function handleIgvChange() { const p = Number($("igv-rate").value); if (Number.isNaN(p) || p < 0) return; state.igvRate = p; persist(); recalcTotals(); renderQuoteDraft(); }
function upsert(list, record) { const i = list.findIndex((item) => item.id === record.id); if (i >= 0) list[i] = record; else list.unshift(record); }

function renderAll() {
  $("igv-rate").value = String(state.igvRate);
  renderClients(); renderProducts(); renderSelectors(); syncSelectedProductPrice(); syncQuoteProductPrice(); renderInvoices(); renderQuoteDraft();
  if (state.quotes[0]) renderQuotePreview(state.quotes[0]); else $("quote-preview").innerHTML = "";
}

function renderSelectors() {
  const clients = state.clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  const products = state.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  $("invoice-client").innerHTML = clients; $("quote-client").innerHTML = clients; $("invoice-product").innerHTML = products; $("quote-product").innerHTML = products;
}
function syncSelectedProductPrice() { const p = state.products.find((x) => x.id === $("invoice-product").value); $("invoice-unit-price").value = p ? String(p.price) : "0"; recalcTotals(); }
function syncQuoteProductPrice() { const p = state.products.find((x) => x.id === $("quote-product").value); $("quote-unit-price").value = p ? String(p.price) : "0"; }
function calculateTotals(qty, unitPrice, igvRate) { const subtotal = qty * unitPrice; const igv = subtotal * (igvRate / 100); return { subtotal, igv, total: subtotal + igv }; }
function recalcTotals() { const s = calculateTotals(Number($("invoice-qty").value || 0), Number($("invoice-unit-price").value || 0), state.igvRate); $("subtotal").textContent = `S/. ${format(s.subtotal)}`; $("igv").textContent = `S/. ${format(s.igv)}`; $("total").textContent = `S/. ${format(s.total)}`; }

function renderClients() { const c = $("client-list"); c.innerHTML = ""; state.clients.forEach((x) => c.appendChild(buildCard(x.image, [x.name, `DNI/RUC: ${x.doc}`, x.email], () => fillClientForm(x), () => removeClient(x.id)))); }
function renderProducts() { const c = $("product-list"); c.innerHTML = ""; state.products.forEach((x) => c.appendChild(buildCard(x.image, [x.name, `Código: ${x.code}`, `Precio: S/. ${format(x.price)}`], () => fillProductForm(x), () => removeProduct(x.id)))); }

function buildCard(image, lines, onEdit, onDelete) {
  const node = $("card-template").content.cloneNode(true);
  node.querySelector(".thumb").src = image || "https://placehold.co/420x200?text=Sin+imagen";
  const content = node.querySelector(".content");
  lines.forEach((line, idx) => { const el = document.createElement(idx === 0 ? "strong" : "span"); el.textContent = line; content.appendChild(el); });
  const actions = document.createElement("div"); actions.className = "actions";
  const e = document.createElement("button"); e.type = "button"; e.textContent = "Editar"; e.onclick = onEdit;
  const d = document.createElement("button"); d.type = "button"; d.textContent = "Eliminar"; d.onclick = onDelete;
  actions.append(e, d); content.appendChild(actions); return node;
}

function renderInvoices() {
  const c = $("invoice-list");
  if (!state.invoices.length) return (c.innerHTML = "<p>Aún no hay ventas registradas.</p>");
  const rows = state.invoices.map((i) => `<tr><td>${new Date(i.date).toLocaleString()}</td><td>${escapeHtml(i.clientName)}</td><td>${escapeHtml(i.productName)}</td><td>${i.qty}</td><td>S/. ${format(i.unitPrice)}</td><td>S/. ${format(i.subtotal)}</td><td>${format(i.igvRate)}%</td><td>S/. ${format(i.igv)}</td><td><strong>S/. ${format(i.total)}</strong></td></tr>`).join("");
  c.innerHTML = `<table><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th><th>% IGV</th><th>IGV</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderQuoteDraft() {
  const c = $("quote-items");
  if (!quoteDraft.items.length) return (c.innerHTML = "<p>Aún no hay ítems en la cotización.</p>");
  const rows = quoteDraft.items.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.description)}</td><td>${item.qty}</td><td>S/. ${format(item.unitPrice)}</td><td>S/. ${format(item.discount)}</td><td>S/. ${format(item.lineTotal)}</td></tr>`).join("");
  c.innerHTML = `<table><thead><tr><th>#</th><th>Código</th><th>Descripción</th><th>Cant.</th><th>Unit.</th><th>Dscto.</th><th>Total línea</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderQuotePreview(quote) {
  $("quote-preview").innerHTML = `<div class="quote-header"><h3>COTIZACIÓN ${escapeHtml(quote.number)}</h3><p><strong>Fecha:</strong> ${new Date(quote.date).toLocaleDateString()} | <strong>Válido hasta:</strong> ${new Date(quote.validUntil).toLocaleDateString()}</p><p><strong>Cliente:</strong> ${escapeHtml(quote.client.name)} (${escapeHtml(quote.client.doc)})</p><p><strong>Correo:</strong> ${escapeHtml(quote.client.email)} | <strong>Atención:</strong> ${escapeHtml(quote.attention || "-")}</p></div><div class="table-container"><table><thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P.Unit.</th><th>Dscto.</th><th>Total</th></tr></thead><tbody>${quote.items.map((item, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(item.description)}</td><td>${item.qty}</td><td>${quote.currency} ${format(item.unitPrice)}</td><td>${quote.currency} ${format(item.discount)}</td><td>${quote.currency} ${format(item.lineTotal)}</td></tr>`).join("")}</tbody></table></div><div class="quote-summary"><p>Subtotal: <strong>${quote.currency} ${format(quote.subtotal)}</strong></p><p>IGV (${format(quote.igvRate)}%): <strong>${quote.currency} ${format(quote.igv)}</strong></p><p>Total: <strong>${quote.currency} ${format(quote.total)}</strong></p><p><strong>Observaciones:</strong> ${escapeHtml(quote.notes || "Sin observaciones")}</p></div>`;
}

function fillClientForm(c) { $("client-id").value = c.id; $("client-name").value = c.name; $("client-doc").value = c.doc; $("client-email").value = c.email; }
function fillProductForm(p) { $("product-id").value = p.id; $("product-name").value = p.name; $("product-code").value = p.code; $("product-price").value = String(p.price); }
function resetClientForm() { clientForm.reset(); $("client-id").value = ""; }
function resetProductForm() { productForm.reset(); $("product-id").value = ""; }
function removeClient(id) { state.clients = state.clients.filter((x) => x.id !== id); persist(); renderAll(); }
function removeProduct(id) { state.products = state.products.filter((x) => x.id !== id); persist(); renderAll(); }

function exportDb() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "ventas-db.json"; a.click(); URL.revokeObjectURL(url); showStatus("Datos exportados.");
}

async function importDb(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    state.igvRate = Number(parsed.igvRate ?? DEFAULT_IGV);
    state.clients = Array.isArray(parsed.clients) ? parsed.clients : [];
    state.products = Array.isArray(parsed.products) ? parsed.products : [];
    state.invoices = Array.isArray(parsed.invoices) ? parsed.invoices : [];
    state.quotes = Array.isArray(parsed.quotes) ? parsed.quotes : [];
    persist(); renderAll(); showStatus("Datos importados.");
  } catch { showStatus("Error al importar JSON.", "error"); }
  event.target.value = "";
}

function resetDb() {
  if (!confirm("¿Seguro que quieres borrar todos los datos?")) return;
  Object.assign(state, structuredClone(initialData)); quoteDraft.items = []; persist(); renderAll(); showStatus("Base de datos reiniciada.");
}

function format(n) { return Number(n || 0).toFixed(2); }
function escapeHtml(text) { const d = document.createElement("div"); d.textContent = String(text ?? ""); return d.innerHTML; }
