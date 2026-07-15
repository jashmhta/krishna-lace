/**
 * Drives shipped src/lib/store.js — stock, invoices, payments, counter.
 * Installs memory localStorage before importing the store module.
 */
import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installMemoryLocalStorage } from "./memory-storage.js";

installMemoryLocalStorage();

const store = await import("../src/lib/store.js");
const {
  __resetForTests,
  getState,
  addProduct,
  createInvoice,
  removeInvoice,
  recordPayment,
  setNextInvoiceNumber,
  nextInvoiceNumber,
  productById,
  assertStockAvailable,
} = store;

function seedProduct(overrides = {}) {
  return addProduct({
    name: "Test Lace",
    sku: "T-1",
    category: "Lace",
    stock: 10,
    unit: "Meter",
    cost: 10,
    price: 25,
    lowStock: 2,
    photo: "",
    ...overrides,
  });
}

before(() => {
  // Confirm we are exercising the real module, not a reimplementation
  assert.equal(typeof createInvoice, "function");
  assert.equal(typeof recordPayment, "function");
  assert.equal(typeof __resetForTests, "function");
});

beforeEach(() => {
  __resetForTests({
    products: [],
    clients: [],
    invoices: [],
    counter: 1001,
    settings: { invoicePrefix: "KLH", taxRate: 0 },
  });
});

describe("counter / next invoice number", () => {
  it("uses configured counter and prefix", () => {
    setNextInvoiceNumber(2500);
    assert.equal(getState().counter, 2500);
    assert.equal(nextInvoiceNumber(), "KLH-2500");
  });

  it("increments counter after successful create", () => {
    const p = seedProduct({ stock: 5 });
    setNextInvoiceNumber(42);
    const inv = createInvoice({
      client: { name: "Walk-in" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 25, discount: 0 }],
      paid: 0,
    });
    assert.equal(inv.number, "KLH-42");
    assert.equal(getState().counter, 43);
    assert.equal(nextInvoiceNumber(), "KLH-43");
  });

  it("setNextInvoiceNumber floors and enforces minimum 1", () => {
    setNextInvoiceNumber(3.9);
    assert.equal(getState().counter, 3);
    setNextInvoiceNumber(0);
    assert.equal(getState().counter, 1);
    setNextInvoiceNumber(-10);
    assert.equal(getState().counter, 1);
  });
});

describe("createInvoice stock invariants", () => {
  it("decrements stock once per sold qty on success", () => {
    const p = seedProduct({ stock: 10 });
    createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 3, price: 25, discount: 0 }],
    });
    assert.equal(productById(p.id).stock, 7);
    assert.equal(getState().invoices.length, 1);
  });

  it("aggregates qty across lines for the same product", () => {
    const p = seedProduct({ stock: 10 });
    createInvoice({
      client: { name: "A" },
      items: [
        { productId: p.id, name: p.name, qty: 4, price: 25, discount: 0 },
        { productId: p.id, name: p.name, qty: 3, price: 25, discount: 0 },
      ],
    });
    assert.equal(productById(p.id).stock, 3);
  });

  it("rejects oversell and leaves stock and counter unchanged", () => {
    const p = seedProduct({ stock: 5 });
    const counterBefore = getState().counter;
    assert.throws(
      () =>
        createInvoice({
          client: { name: "A" },
          items: [{ productId: p.id, name: p.name, qty: 9, price: 25, discount: 0 }],
        }),
      /Not enough stock/
    );
    assert.equal(productById(p.id).stock, 5);
    assert.equal(getState().invoices.length, 0);
    assert.equal(getState().counter, counterBefore);
  });

  it("rejects oversell when multi-line total exceeds stock", () => {
    const p = seedProduct({ stock: 5 });
    assert.throws(
      () =>
        createInvoice({
          client: { name: "A" },
          items: [
            { productId: p.id, name: p.name, qty: 3, price: 25, discount: 0 },
            { productId: p.id, name: p.name, qty: 3, price: 25, discount: 0 },
          ],
        }),
      /Not enough stock/
    );
    assert.equal(productById(p.id).stock, 5);
  });

  it("allows custom lines without productId without touching stock", () => {
    const p = seedProduct({ stock: 10 });
    createInvoice({
      client: { name: "A" },
      items: [{ productId: null, name: "Custom hem", qty: 2, price: 50, discount: 0 }],
    });
    assert.equal(productById(p.id).stock, 10);
  });

  it("assertStockAvailable is the guard used before mutate", () => {
    const p = seedProduct({ stock: 2 });
    assert.throws(
      () => assertStockAvailable([{ productId: p.id, qty: 5 }]),
      /Not enough stock/
    );
  });

  it("clamps paid on create and sets derived status", () => {
    const p = seedProduct({ stock: 10, price: 100 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 100, discount: 0 }],
      taxRate: 0,
      paid: 999,
    });
    assert.equal(inv.paid, 100);
    assert.equal(inv.status, "Paid");

    const unpaid = createInvoice({
      client: { name: "B" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 100, discount: 0 }],
      paid: 0,
    });
    assert.equal(unpaid.status, "Unpaid");

    const partial = createInvoice({
      client: { name: "C" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 100, discount: 0 }],
      paid: 30,
    });
    assert.equal(partial.status, "Partial");
    assert.equal(partial.paid, 30);
  });
});

describe("removeInvoice restores stock", () => {
  it("adds back linked product qty and drops the invoice", () => {
    const p = seedProduct({ stock: 10 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 4, price: 25, discount: 0 }],
    });
    assert.equal(productById(p.id).stock, 6);
    removeInvoice(inv.id);
    assert.equal(productById(p.id).stock, 10);
    assert.equal(getState().invoices.length, 0);
  });

  it("does not change stock for custom-only lines", () => {
    const p = seedProduct({ stock: 10 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: null, name: "Service", qty: 1, price: 50, discount: 0 }],
    });
    removeInvoice(inv.id);
    assert.equal(productById(p.id).stock, 10);
  });
});

describe("recordPayment", () => {
  it("clamps applied amount to remaining balance (toast-equivalent applied)", () => {
    const p = seedProduct({ stock: 10 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 200, discount: 0 }],
      paid: 50,
    });
    // Type 1000 but only 150 balance left
    const result = recordPayment(inv.id, 1000);
    assert.equal(result.applied, 150);
    assert.equal(result.paid, 200);
    assert.equal(result.status, "Paid");

    const stored = getState().invoices.find((x) => x.id === inv.id);
    assert.equal(stored.paid, 200);
    assert.equal(stored.status, "Paid");
  });

  it("records partial payment with correct applied amount", () => {
    const p = seedProduct({ stock: 10 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 200, discount: 0 }],
      paid: 0,
    });
    const result = recordPayment(inv.id, 75);
    assert.equal(result.applied, 75);
    assert.equal(result.paid, 75);
    assert.equal(result.status, "Partial");
  });

  it("returns applied 0 when already paid in full", () => {
    const p = seedProduct({ stock: 10 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 100, discount: 0 }],
      paid: 100,
    });
    const result = recordPayment(inv.id, 50);
    assert.equal(result.applied, 0);
    assert.equal(result.paid, 100);
    assert.equal(result.status, "Paid");
  });

  it("ignores negative amounts", () => {
    const p = seedProduct({ stock: 10 });
    const inv = createInvoice({
      client: { name: "A" },
      items: [{ productId: p.id, name: p.name, qty: 1, price: 100, discount: 0 }],
      paid: 0,
    });
    const result = recordPayment(inv.id, -20);
    assert.equal(result.applied, 0);
    assert.equal(result.paid, 0);
    assert.equal(result.status, "Unpaid");
  });
});
