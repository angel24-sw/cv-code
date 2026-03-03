const STORAGE_KEY = "sales-suite-v2";
const SESSION_KEY = "sales-session-v1";
const DEFAULT_IGV = 18;
const USERS = [{ username: "admin", password: "123456", name: "Administrador" }];

const initialData = {
  igvRate: DEFAULT_IGV,
  company: { name: "Mi Empresa", ruc: "", phone: "", email: "", address: "", logo: "" },
  clients: [],
  products: [],
  quotes: [],
  invoices: [],
};

const state = loadDb();
const quoteDraft = { items: [] };
const $ = (id) => document.getElementById(id);
const statusEl = $("status");

bindEvents();
initSession();

function bindEvents() {
  $("login-form").addEventListener("submit", handleLogin);
  $("logout-btn").addEventListener("click", logout);
  $("main-tabs").addEventListener("click", handleTabClick);

  $("client-form").addEventListener("submit", handleClientSubmit);
  $("client-cancel").addEventListener("click", resetClientForm);

  $("product-form").addEventListener("submit", handleProductSubmit);
  $("product-cancel").addEventListener("click", resetProductForm);

  $("quote-item-form").addEventListener("submit", handleAddQuoteItem);
  $("quote-product").addEventListener("change", syncQuotePrice);
  $("quote-save").addEventListener("click", saveQuote);
  $("quote-clear-items").addEventListener("click", clearQuoteDraft);
  $("quote-print").addEventListener("click", printQuote);
  $("igv-rate").addEventListener("input", onIgvChange);

  $("invoice-form").addEventListener("submit", handleInvoiceSubmit);
  $("invoice-product").addEventListener("change", syncInvoicePrice);
  $("invoice-qty").addEventListener("input", recalcInvoiceTotals);
  $("invoice-unit-price").addEventListener("input", recalcInvoiceTotals);

  $("company-form").addEventListener("submit", handleCompanySubmit);
  $("btn-export").addEventListener("click", exportDb);
  $("btn-import").addEventListener("change", importDb);
  $("btn-reset").addEventListener("click", resetDb);
}

function initSession() {
  const user = loadSession();
  if (!user) return showLogin();
  showApp(user);
  renderAll();
}

function handleLogin(e) {
  e.preventDefault();
  const username = $("login-user").value.trim();
  const password = $("login-pass").value;
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return showStatus("Credenciales inválidas.", "error");
  saveSession({ username: user.username, name: user.name });
  showApp(user);
  renderAll();
  $("login-form").reset();
  showStatus("Bienvenido.");
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
  showStatus("Sesión cerrada.");
}

function showLogin() {
  $("login-panel").classList.remove("hidden");
  $("app-main").classList.add("hidden");
  $("logout-btn").classList.add("hidden");
  $("session-user").textContent = "";
}

function showApp(user) {
  $("login-panel").classList.add("hidden");
  $("app-main").classList.remove("hidden");
  $("logout-btn").classList.remove("hidden");
  $("session-user").textContent = `Usuario: ${user.name}`;
}

function handleTabClick(e) {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === btn.dataset.view));
}

async function handleClientSubmit(e) {
  e.preventDefault();
  const id = $("client-id").value || crypto.randomUUID();
  const existing = state.clients.find((c) => c.id === id);
  const image = (await fileToDataUrl($("client-image"))) ?? existing?.image ?? "";
  const client = {
    id,
    ruc: $("client-ruc").value.trim(),
    businessName: $("client-business").value.trim(),
    phone: $("client-phone").value.trim(),
    email: $("client-email").value.trim(),
    address: $("client-address").value.trim(),
    image,
  };
  if (!client.ruc || !client.businessName) return showStatus("Completa RUC y Razón Social.", "error");
  upsert(state.clients, client);
  resetClientForm();
  persist();
  renderAll();
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = $("product-id").value || crypto.randomUUID();
  const existing = state.products.find((p) => p.id === id);
  const image = (await fileToDataUrl($("product-image"))) ?? existing?.image ?? "";
  const product = {
    id,
    code: $("product-code").value.trim(),
    name: $("product-name").value.trim(),
    price: Number($("product-price").value),
    stock: Number($("product-stock").value),
    image,
  };
  if (!product.code || !product.name || Number.isNaN(product.price)) return showStatus("Producto inválido.", "error");
  upsert(state.products, product);
  resetProductForm();
  persist();
  renderAll();
}

function handleAddQuoteItem(e) {
  e.preventDefault();
  const product = state.products.find((p) => p.id === $("quote-product").value);
  const qty = Number($("quote-qty").value);
  const unitPrice = Number($("quote-unit-price").value);
  const discount = Number($("quote-discount").value || 0);
  if (!product || qty <= 0 || qty > product.stock) return showStatus("Cantidad inválida o stock insuficiente.", "error");

  quoteDraft.items.push({
    id: crypto.randomUUID(),
    productId: product.id,
    code: product.code,
    description: product.name,
    qty,
    unitPrice,
    discount,
    lineTotal: qty * unitPrice - discount,
  });
  $("quote-item-form").reset();
  $("quote-qty").value = "1";
  $("quote-discount").value = "0";
  syncQuotePrice();
  renderQuoteDraft();
}

function saveQuote() {
  const client = state.clients.find((c) => c.id === $("quote-client").value);
  if (!client || !quoteDraft.items.length) return showStatus("Falta cliente o ítems.", "error");

  const subtotal = quoteDraft.items.reduce((acc, item) => acc + item.lineTotal, 0);
  const igv = subtotal * (state.igvRate / 100);
  const quote = {
    id: crypto.randomUUID(),
    number: $("quote-number").value.trim() || `COT-${String(state.quotes.length + 1).padStart(4, "0")}`,
    date: new Date().toISOString(),
    validDays: Number($("quote-valid-days").value || 7),
    status: $("quote-status").value,
    notes: $("quote-notes").value.trim(),
    client,
    items: [...quoteDraft.items],
    igvRate: state.igvRate,
    subtotal,
    igv,
    total: subtotal + igv,
  };
  state.quotes.unshift(quote);
  persist();
  renderQuotePreview(quote);
  showStatus(`Cotización ${quote.number} guardada.`);
}

function handleInvoiceSubmit(e) {
  e.preventDefault();
  const client = state.clients.find((c) => c.id === $("invoice-client").value);
  const product = state.products.find((p) => p.id === $("invoice-product").value);
  const qty = Number($("invoice-qty").value);
  const unitPrice = Number($("invoice-unit-price").value);
  if (!client || !product || qty <= 0 || qty > product.stock) return showStatus("Datos inválidos o stock insuficiente.", "error");

  const { subtotal, igv, total } = calculateTotals(qty, unitPrice, state.igvRate);
  state.invoices.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    clientName: client.businessName,
    productName: product.name,
    qty,
    subtotal,
    igv,
    total,
    docType: $("invoice-doc-type").value,
    electronicStatus: "Emitido",
  });
  product.stock -= qty;
  persist();
  $("invoice-form").reset();
  $("invoice-qty").value = "1";
  renderAll();
}

async function handleCompanySubmit(e) {
  e.preventDefault();
  const logo = (await fileToDataUrl($("company-logo"))) ?? state.company.logo;
  state.company = {
    name: $("company-name").value.trim() || "Mi Empresa",
    ruc: $("company-ruc").value.trim(),
    phone: $("company-phone").value.trim(),
    email: $("company-email").value.trim(),
    address: $("company-address").value.trim(),
    logo,
  };
  persist();
  showStatus("Datos de empresa actualizados.");
  if (state.quotes[0]) renderQuotePreview(state.quotes[0]);
}

function renderAll() {
  $("igv-rate").value = String(state.igvRate);
  fillCompanyForm();
  renderClients();
  renderProducts();
  renderSelectors();
  syncQuotePrice();
  syncInvoicePrice();
  recalcInvoiceTotals();
  renderQuoteDraft();
  renderInvoices();
  renderReports();
  if (state.quotes[0]) renderQuotePreview(state.quotes[0]); else $("quote-preview").innerHTML = "";
}

function fillCompanyForm() {
  $("company-name").value = state.company.name || "";
  $("company-ruc").value = state.company.ruc || "";
  $("company-phone").value = state.company.phone || "";
  $("company-email").value = state.company.email || "";
  $("company-address").value = state.company.address || "";
}

function renderClients() {
  const container = $("client-list");
  container.innerHTML = "";
  state.clients.forEach((c) => {
    container.appendChild(buildCard(c.image, [c.businessName, `RUC: ${c.ruc}`, `Tel: ${c.phone}`], () => fillClientForm(c), () => removeClient(c.id)));
  });
}

function renderProducts() {
  const container = $("product-list");
  container.innerHTML = "";
  state.products.forEach((p) => {
    container.appendChild(buildCard(p.image, [p.name, `Código: ${p.code}`, `S/. ${format(p.price)} - Stock: ${p.stock}`], () => fillProductForm(p), () => removeProduct(p.id)));
  });
}

function renderSelectors() {
  const clients = state.clients.map((c) => `<option value="${c.id}">${escapeHtml(c.businessName)}</option>`).join("");
  const products = state.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  $("quote-client").innerHTML = clients;
  $("invoice-client").innerHTML = clients;
  $("quote-product").innerHTML = products;
  $("invoice-product").innerHTML = products;
}

function renderQuoteDraft() {
  const container = $("quote-items");
  if (!quoteDraft.items.length) return (container.innerHTML = "<p>No hay ítems en borrador.</p>");
  const rows = quoteDraft.items
    .map(
      (i, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(i.code)}</td><td>${escapeHtml(i.description)}</td><td>${i.qty}</td><td>S/. ${format(i.unitPrice)}</td><td>S/. ${format(i.discount)}</td><td>S/. ${format(i.lineTotal)}</td></tr>`
    )
    .join("");
  container.innerHTML = `<table><thead><tr><th>#</th><th>Código</th><th>Descripción</th><th>Cant.</th><th>Unit.</th><th>Dscto.</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderQuotePreview(q) {
  const logo = state.company.logo ? `<img class="quote-logo" src="${state.company.logo}" alt="Logo" />` : "";
  $("quote-preview").innerHTML = `
    <div class="quote-head">
      <div>${logo}</div>
      <div>
        <h3>${escapeHtml(state.company.name || "Mi Empresa")}</h3>
        <p>RUC: ${escapeHtml(state.company.ruc || "-")} | Tel: ${escapeHtml(state.company.phone || "-")}</p>
        <p>${escapeHtml(state.company.email || "-")} | ${escapeHtml(state.company.address || "-")}</p>
      </div>
      <div class="quote-meta"><strong>${escapeHtml(q.number)}</strong><span>${new Date(q.date).toLocaleDateString()}</span><span>Estado: ${escapeHtml(q.status)}</span></div>
    </div>
    <hr />
    <p><strong>Cliente:</strong> ${escapeHtml(q.client.businessName)} (RUC ${escapeHtml(q.client.ruc)})</p>
    <div class="table-container">
      <table class="quote-table">
        <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Dscto.</th><th>Total</th></tr></thead>
        <tbody>
          ${q.items
            .map(
              (item, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(item.description)}</td><td>${item.qty}</td><td>S/. ${format(item.unitPrice)}</td><td>S/. ${format(item.discount)}</td><td>S/. ${format(item.lineTotal)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="quote-totals">
      <p>Subtotal: <strong>S/. ${format(q.subtotal)}</strong></p>
      <p>IGV (${format(q.igvRate)}%): <strong>S/. ${format(q.igv)}</strong></p>
      <p>Total: <strong>S/. ${format(q.total)}</strong></p>
    </div>
    <p><strong>Observaciones:</strong> ${escapeHtml(q.notes || "-")}</p>
  `;
}

function renderInvoices() {
  const container = $("invoice-list");
  if (!state.invoices.length) return (container.innerHTML = "<p>No hay ventas registradas.</p>");
  const rows = state.invoices
    .map((i) => `<tr><td>${new Date(i.date).toLocaleString()}</td><td>${escapeHtml(i.docType)}</td><td>${escapeHtml(i.clientName)}</td><td>${escapeHtml(i.productName)}</td><td>${i.qty}</td><td>S/. ${format(i.total)}</td><td>${escapeHtml(i.electronicStatus)}</td></tr>`)
    .join("");
  container.innerHTML = `<table><thead><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderReports() {
  const totalSales = state.invoices.reduce((acc, i) => acc + i.total, 0);
  const totalQuotes = state.quotes.length;
  const lowStock = state.products.filter((p) => p.stock <= 5).length;
  $("reports-box").innerHTML = `<article class="kpi"><h3>S/. ${format(totalSales)}</h3><p>Ventas acumuladas</p></article><article class="kpi"><h3>${totalQuotes}</h3><p>Cotizaciones</p></article><article class="kpi"><h3>${lowStock}</h3><p>Stock bajo</p></article>`;
}

function syncQuotePrice() {
  const p = state.products.find((x) => x.id === $("quote-product").value);
  $("quote-unit-price").value = p ? String(p.price) : "0";
}

function syncInvoicePrice() {
  const p = state.products.find((x) => x.id === $("invoice-product").value);
  $("invoice-unit-price").value = p ? String(p.price) : "0";
}

function recalcInvoiceTotals() {
  const { subtotal, igv, total } = calculateTotals(Number($("invoice-qty").value || 0), Number($("invoice-unit-price").value || 0), state.igvRate);
  $("subtotal").textContent = `S/. ${format(subtotal)}`;
  $("igv").textContent = `S/. ${format(igv)}`;
  $("total").textContent = `S/. ${format(total)}`;
}

function onIgvChange() {
  const rate = Number($("igv-rate").value);
  if (Number.isNaN(rate) || rate < 0) return;
  state.igvRate = rate;
  persist();
  recalcInvoiceTotals();
}

function clearQuoteDraft() { quoteDraft.items = []; renderQuoteDraft(); }
function printQuote() { if (!$("quote-preview").innerHTML.trim()) return; window.print(); }
function fillClientForm(c) { $("client-id").value = c.id; $("client-ruc").value = c.ruc; $("client-business").value = c.businessName; $("client-phone").value = c.phone; $("client-email").value = c.email; $("client-address").value = c.address || ""; }
function fillProductForm(p) { $("product-id").value = p.id; $("product-code").value = p.code; $("product-name").value = p.name; $("product-price").value = p.price; $("product-stock").value = p.stock; }
function removeClient(id) { state.clients = state.clients.filter((x) => x.id !== id); persist(); renderAll(); }
function removeProduct(id) { state.products = state.products.filter((x) => x.id !== id); persist(); renderAll(); }
function resetClientForm() { $("client-form").reset(); $("client-id").value = ""; }
function resetProductForm() { $("product-form").reset(); $("product-id").value = ""; }

function buildCard(image, lines, onEdit, onDelete) {
  const node = $("card-template").content.cloneNode(true);
  node.querySelector(".thumb").src = image || "https://placehold.co/420x200?text=Sin+imagen";
  const content = node.querySelector(".content");
  lines.forEach((line, idx) => {
    const el = document.createElement(idx === 0 ? "strong" : "span");
    el.textContent = line;
    content.appendChild(el);
  });
  const actions = document.createElement("div");
  actions.className = "actions";
  const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Editar"; edit.onclick = onEdit;
  const del = document.createElement("button"); del.type = "button"; del.textContent = "Eliminar"; del.onclick = onDelete;
  actions.append(edit, del);
  content.appendChild(actions);
  return node;
}

async function fileToDataUrl(input) {
  const file = input.files?.[0];
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function upsert(list, record) { const idx = list.findIndex((x) => x.id === record.id); if (idx >= 0) list[idx] = record; else list.unshift(record); }
function calculateTotals(qty, unitPrice, igvRate) { const subtotal = qty * unitPrice; const igv = subtotal * (igvRate / 100); return { subtotal, igv, total: subtotal + igv }; }
function showStatus(message, kind = "ok") { statusEl.textContent = message; statusEl.className = `status ${kind}`; }
function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function loadSession() { try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialData);
    const p = JSON.parse(raw);
    return {
      igvRate: Number(p.igvRate ?? DEFAULT_IGV),
      company: p.company || structuredClone(initialData.company),
      clients: p.clients || [],
      products: p.products || [],
      quotes: p.quotes || [],
      invoices: p.invoices || [],
    };
  } catch {
    return structuredClone(initialData);
  }
}
function exportDb() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "sales-suite-db.json"; a.click(); URL.revokeObjectURL(url); }
async function importDb(e) { const f = e.target.files?.[0]; if (!f) return; try { const p = JSON.parse(await f.text()); state.igvRate = Number(p.igvRate ?? DEFAULT_IGV); state.company = p.company || structuredClone(initialData.company); state.clients = p.clients || []; state.products = p.products || []; state.quotes = p.quotes || []; state.invoices = p.invoices || []; persist(); renderAll(); showStatus("Datos importados."); } catch { showStatus("JSON inválido.", "error"); } e.target.value = ""; }
function resetDb() { if (!confirm("¿Borrar todos los datos?")) return; Object.assign(state, structuredClone(initialData)); quoteDraft.items = []; persist(); renderAll(); }
function format(v) { return Number(v || 0).toFixed(2); }
function escapeHtml(text) { const d = document.createElement("div"); d.textContent = String(text ?? ""); return d.innerHTML; }
