import { uid, nowISO } from "./id.js";

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
      if (res.ok) lastSyncAt = Date.now();
      else if (res.status === 200) apiAvailable = false; // no-database response
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

// ---------- PRODUCTS ----------
export function addProduct(data) {
  const p = { id: uid("p"), ...data, photo: data.photo || "", createdAt: nowISO(), updatedAt: nowISO() };
  state.products = [p, ...state.products];
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
  state.products = state.products.map((p) =>
    p.id === id ? { ...p, stock: Math.max(0, (p.stock || 0) + delta), updatedAt: nowISO() } : p
  );
  persist();
}
export function setProducts(list) {
  state.products = list;
  persist();
}

// ---------- CLIENTS ----------
export function addClient(data) {
  const c = { id: uid("c"), ...data, createdAt: nowISO() };
  state.clients = [c, ...state.clients];
  persist();
  return c;
}
export function updateClient(id, patch) {
  state.clients = state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c));
  persist();
}
export function removeClient(id) {
  state.clients = state.clients.filter((c) => c.id !== id);
  // keep invoices (they store a snapshot) but unlink client id
  state.invoices = state.invoices.map((inv) =>
    inv.clientId === id ? { ...inv, clientId: null } : inv
  );
  persist();
}

// ---------- INVOICES ----------
export function nextInvoiceNumber() {
  return `${state.settings.invoicePrefix}-${state.counter}`;
}

export function createInvoice(data) {
  const number = nextInvoiceNumber();
  const inv = {
    id: uid("inv"),
    number,
    date: data.date || new Date().toISOString().slice(0, 10),
    clientId: data.clientId || null,
    client: data.client, // snapshot {name, phone, address, gstin}
    items: data.items || [],
    discount: data.discount || 0,
    taxRate: data.taxRate ?? state.settings.taxRate,
    paid: data.paid || 0,
    status: data.status || "Unpaid",
    notes: data.notes || "",
    createdAt: nowISO(),
  };
  state.invoices = [inv, ...state.invoices];
  state.counter += 1;
  // decrement stock for sold items
  inv.items.forEach((it) => {
    if (it.productId) adjustStock(it.productId, -Math.max(0, Number(it.qty) || 0));
  });
  persist();
  return inv;
}

export function updateInvoice(id, patch) {
  state.invoices = state.invoices.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv));
  persist();
}

export function setInvoiceStatus(id, status) {
  updateInvoice(id, { status });
}

export function removeInvoice(id) {
  state.invoices = state.invoices.filter((inv) => inv.id !== id);
  persist();
}

// reset / danger
export function clearAllData() {
  state = freshState();
  persist();
}

// ---------- DERIVED HELPERS ----------
export function productById(id) {
  return state.products.find((p) => p.id === id);
}
export function clientById(id) {
  return state.clients.find((c) => c.id === id);
}
