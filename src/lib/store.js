import { uid, nowISO } from "./id.js";
import { invoiceTotals, paymentStatus } from "./calc.js";

const KEY = "klh_store_v1";

// ---- Default business profile (Krishna Lace House, Mumbai) ----
const defaultSettings = {
  business: "Krishna Lace House",
  tagline: "Laces, Borders & Fancy Fabrics",
  address: "1st Floor, Crawford Market, Mumbai 400001",
  phone: "9876543210",
  email: "",
  gstin: "",
  state: "Maharashtra",
  currency: "INR",
  taxRate: 0, // % GST applied by default on invoices (0 = off)
  lowStockDefault: 10,
  invoicePrefix: "KLH",
  invoiceStart: 1001,
};

// ---- Seed products: realistic lace / textile catalogue ----
const seedProducts = [
  { name: "Flower Net Lace — White", category: "Lace", sku: "L-101", stock: 120, unit: "Meter", cost: 18, price: 35, lowStock: 15, photo: "" },
  { name: "Sequin Border Lace — Gold", category: "Border", sku: "B-204", stock: 45, unit: "Meter", cost: 60, price: 110, lowStock: 12, photo: "" },
  { name: "Cotton Lap — Red", category: "Fabric", sku: "F-310", stock: 8, unit: "Meter", cost: 90, price: 150, lowStock: 10, photo: "" },
  { name: "Handwork Embroidery Border", category: "Border", sku: "B-318", stock: 30, unit: "Piece", cost: 140, price: 260, lowStock: 8, photo: "" },
  { name: "Satin Ribbon Lace — Black", category: "Lace", sku: "L-122", stock: 200, unit: "Meter", cost: 12, price: 25, lowStock: 20, photo: "" },
  { name: "Zari Work Lace — Maroon", category: "Lace", sku: "L-145", stock: 6, unit: "Meter", cost: 75, price: 145, lowStock: 10, photo: "" },
  { name: "Georgette Fabric — Royal Blue", category: "Fabric", sku: "F-330", stock: 60, unit: "Meter", cost: 110, price: 195, lowStock: 15, photo: "" },
  { name: "Cut Dana Border — Silver", category: "Border", sku: "B-260", stock: 22, unit: "Meter", cost: 95, price: 180, lowStock: 10, photo: "" },
  { name: "Lace Dupatta — Cream", category: "Dupatta", sku: "D-410", stock: 40, unit: "Piece", cost: 220, price: 420, lowStock: 8, photo: "" },
  { name: "Pearl Beaded Lace — Ivory", category: "Lace", sku: "L-160", stock: 14, unit: "Meter", cost: 85, price: 160, lowStock: 12, photo: "" },
].map((p) => ({ id: uid("p"), ...p, createdAt: nowISO(), updatedAt: nowISO() }));

const seedClients = [
  { name: "Sharma Garments", phone: "9820011223", email: "", address: "Surat, Gujarat", gstin: "", createdAt: nowISO() },
  { name: "Meera Boutique", phone: "9930045566", email: "meera.boutique@gmail.com", address: "Borivali West, Mumbai", gstin: "", createdAt: nowISO() },
  { name: "Aarav Textiles", phone: "9004011223", email: "", address: "Bhiwandi, Maharashtra", gstin: "", createdAt: nowISO() },
].map((c) => ({ id: uid("c"), ...c }));

function freshState() {
  return {
    settings: { ...defaultSettings },
    products: seedProducts,
    clients: seedClients,
    invoices: [],
    counter: defaultSettings.invoiceStart,
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    const base = freshState();
    return {
      settings: { ...base.settings, ...(parsed.settings || {}) },
      products: parsed.products || [],
      clients: parsed.clients || [],
      invoices: parsed.invoices || [],
      counter: parsed.counter || base.settings.invoiceStart,
    };
  } catch {
    return freshState();
  }
}

function persist() {
  state = { ...state };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
  scheduleSync();
}

// ---- Cloud sync (Postgres via /api/store) ----
let syncTimer = null;
let apiAvailable = null; // null = unknown, true/false after first check
let lastSyncAt = 0;

export function isCloudEnabled() {
  return apiAvailable === true;
}

export async function syncFromAPI() {
  try {
    const res = await fetch("/api/store", { method: "GET" });
    if (!res.ok) { apiAvailable = false; return false; }
    const data = await res.json();
    if (data && data.products) {
      // Cloud has data — replace local state
      state = data;
      localStorage.setItem(KEY, JSON.stringify(state));
      listeners.forEach((fn) => fn(state));
      apiAvailable = true;
      lastSyncAt = Date.now();
      return true;
    } else {
      // Cloud reachable but empty — push current state up
      apiAvailable = true;
      scheduleSync();
      return true;
    }
  } catch {
    apiAvailable = false;
    return false;
  }
}

function scheduleSync() {
  if (apiAvailable === false) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) return;
      let body = null;
      try { body = await res.json(); } catch { /* empty body is fine */ }
      // API returns { ok: false, error: "no-database" } with 200 when Neon is not configured
      if (body && body.ok === false) {
        apiAvailable = false;
        return;
      }
      lastSyncAt = Date.now();
      apiAvailable = true;
    } catch {
      // offline or no API — silently ignore, localStorage still works
    }
  }, 1500);
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- SETTINGS ----------
export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  persist();
}

/** Set the next invoice sequence number (used by Settings "Next number"). */
export function setNextInvoiceNumber(n) {
  const v = Math.max(1, Math.floor(Number(n) || 1));
  state.counter = v;
  state.settings = { ...state.settings, invoiceStart: v };
  persist();
}

// ---------- PRODUCTS ----------
/** Apply stock delta without persisting (used when batching with invoice create/delete). */
function applyStockDelta(id, delta) {
  state.products = state.products.map((p) =>
    p.id === id
      ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) + delta), updatedAt: nowISO() }
      : p
  );
}

export function addProduct(data) {
  const p = {
    ...data,
    id: data.id || uid("p"),
    photo: data.photo || "",
    createdAt: data.createdAt || nowISO(),
    updatedAt: nowISO(),
  };
  // Avoid duplicate id if restoring
  state.products = [p, ...state.products.filter((x) => x.id !== p.id)];
  persist();
  return p;
}
export function updateProduct(id, patch) {
  state.products = state.products.map((p) =>
    p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p
  );
  persist();
}
export function removeProduct(id) {
  state.products = state.products.filter((p) => p.id !== id);
  persist();
}
export function adjustStock(id, delta) {
  applyStockDelta(id, delta);
  persist();
}
export function setProducts(list) {
  state.products = list;
  persist();
}

// ---------- CLIENTS ----------
export function addClient(data) {
  const c = {
    ...data,
    id: data.id || uid("c"),
    createdAt: data.createdAt || nowISO(),
  };
  state.clients = [c, ...state.clients.filter((x) => x.id !== c.id)];
  persist();
  return c;
}
export function updateClient(id, patch) {
  state.clients = state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c));
  persist();
}
export function removeClient(id) {
  // Keep invoice.clientId so undo (restore same id) re-links cleanly.
  // Invoice already stores a client snapshot for display.
  state.clients = state.clients.filter((c) => c.id !== id);
  persist();
}

// ---------- INVOICES ----------
export function nextInvoiceNumber() {
  return `${state.settings.invoicePrefix}-${state.counter}`;
}

/**
 * Aggregate qty needed per productId from line items.
 */
function stockNeedByProduct(items) {
  const need = {};
  for (const it of items || []) {
    if (!it.productId) continue;
    const q = Math.max(0, Number(it.qty) || 0);
    if (q <= 0) continue;
    need[it.productId] = (need[it.productId] || 0) + q;
  }
  return need;
}

/**
 * Throws Error with message if any linked product lacks stock.
 */
export function assertStockAvailable(items) {
  const need = stockNeedByProduct(items);
  for (const [pid, qty] of Object.entries(need)) {
    const p = state.products.find((x) => x.id === pid);
    if (!p) {
      throw new Error("A product on this invoice is no longer in stock. Remove it or add a custom line.");
    }
    const have = Number(p.stock) || 0;
    if (have < qty) {
      throw new Error(
        `Not enough stock for "${p.name}" — have ${have} ${p.unit || ""}, need ${qty}`.trim()
      );
    }
  }
}

export function createInvoice(data) {
  const items = (data.items || []).map((it) => ({
    ...it,
    qty: Number(it.qty) || 0,
    price: Number(it.price) || 0,
    discount: Number(it.discount) || 0,
  }));

  assertStockAvailable(items);

  const draft = {
    items,
    discount: Number(data.discount) || 0,
    taxRate: data.taxRate ?? state.settings.taxRate,
    paid: Number(data.paid) || 0,
  };
  const totals = invoiceTotals(draft);
  const paid = totals.paid; // clamped to total
  const status = paymentStatus(paid, totals.total);

  const number = nextInvoiceNumber();
  const inv = {
    id: uid("inv"),
    number,
    date: data.date || new Date().toISOString().slice(0, 10),
    clientId: data.clientId || null,
    client: data.client, // snapshot {name, phone, address, gstin}
    items,
    discount: draft.discount,
    taxRate: draft.taxRate,
    paid,
    status,
    notes: data.notes || "",
    createdAt: nowISO(),
  };

  state.invoices = [inv, ...state.invoices];
  state.counter += 1;

  // Decrement stock once, then single persist
  for (const it of inv.items) {
    if (it.productId) applyStockDelta(it.productId, -Math.max(0, Number(it.qty) || 0));
  }
  persist();
  return inv;
}

export function updateInvoice(id, patch) {
  state.invoices = state.invoices.map((inv) => {
    if (inv.id !== id) return inv;
    const next = { ...inv, ...patch };
    // Keep paid clamped and status derived whenever paid is touched
    if ("paid" in patch) {
      const t = invoiceTotals(next);
      next.paid = t.paid;
      next.status = paymentStatus(t.paid, t.total);
    }
    return next;
  });
  persist();
}

export function setInvoiceStatus(id, status) {
  const inv = state.invoices.find((x) => x.id === id);
  if (!inv) return;
  const t = invoiceTotals(inv);
  const s = (status || "").toLowerCase();
  if (s === "paid") {
    updateInvoice(id, { paid: t.total });
  } else if (s === "unpaid") {
    updateInvoice(id, { paid: 0 });
  } else {
    // Partial / unknown: re-clamp paid and re-derive status (never store a free-floating label)
    updateInvoice(id, { paid: t.paid });
  }
}

/** Record a payment; returns { applied, paid, status }. */
export function recordPayment(id, amount) {
  const inv = state.invoices.find((x) => x.id === id);
  if (!inv) return { applied: 0, paid: 0, status: "Unpaid" };
  const t = invoiceTotals(inv);
  const applied = Math.min(t.balance, Math.max(0, Number(amount) || 0));
  const paid = t.paid + applied;
  const status = paymentStatus(paid, t.total);
  updateInvoice(id, { paid, status });
  return { applied, paid, status };
}

export function removeInvoice(id) {
  const inv = state.invoices.find((x) => x.id === id);
  if (inv) {
    // Restore stock for linked line items
    for (const it of inv.items || []) {
      if (it.productId) applyStockDelta(it.productId, Math.max(0, Number(it.qty) || 0));
    }
  }
  state.invoices = state.invoices.filter((x) => x.id !== id);
  persist();
}

// reset / danger
export function clearAllData() {
  state = freshState();
  persist();
}

/**
 * Test-only: replace in-memory state and disable cloud sync.
 * App code must not call this. Used by automated tests to isolate cases.
 */
export function __resetForTests(next) {
  clearTimeout(syncTimer);
  syncTimer = null;
  apiAvailable = false; // never hit network during tests
  lastSyncAt = 0;
  listeners.clear();
  if (next) {
    state = {
      settings: { ...defaultSettings, ...(next.settings || {}) },
      products: next.products || [],
      clients: next.clients || [],
      invoices: next.invoices || [],
      counter: next.counter ?? defaultSettings.invoiceStart,
    };
  } else {
    state = {
      settings: { ...defaultSettings },
      products: [],
      clients: [],
      invoices: [],
      counter: defaultSettings.invoiceStart,
    };
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* node without storage polyfill */
  }
}

// ---------- DERIVED HELPERS ----------
export function productById(id) {
  return state.products.find((p) => p.id === id);
}
export function clientById(id) {
  return state.clients.find((c) => c.id === id);
}
