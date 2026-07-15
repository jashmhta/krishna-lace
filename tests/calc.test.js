/**
 * Drives shipped src/lib/calc.js — invoice math and payment status.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lineTotal,
  invoiceTotals,
  paymentStatus,
  effectiveStatus,
} from "../src/lib/calc.js";

describe("lineTotal", () => {
  it("computes qty * price minus line discount", () => {
    assert.equal(lineTotal({ qty: 3, price: 100, discount: 20 }), 280);
  });

  it("treats missing/invalid fields as 0 and never goes negative", () => {
    assert.equal(lineTotal({}), 0);
    assert.equal(lineTotal({ qty: 2, price: 10, discount: 999 }), 0);
    assert.equal(lineTotal({ qty: "2", price: "15.5", discount: "1" }), 30);
  });
});

describe("invoiceTotals", () => {
  it("sums lines, applies tax on subtotal, then invoice discount", () => {
    const t = invoiceTotals({
      items: [
        { qty: 2, price: 100, discount: 0 },
        { qty: 1, price: 50, discount: 10 },
      ],
      taxRate: 10,
      discount: 20,
      paid: 0,
    });
    // subtotal = 200 + 40 = 240; tax = 24; total = 240 + 24 - 20 = 244
    assert.equal(t.subtotal, 240);
    assert.equal(t.tax, 24);
    assert.equal(t.discount, 20);
    assert.equal(t.total, 244);
    assert.equal(t.paid, 0);
    assert.equal(t.balance, 244);
  });

  it("clamps paid to [0, total] and balance to remaining", () => {
    const over = invoiceTotals({
      items: [{ qty: 1, price: 100 }],
      taxRate: 0,
      discount: 0,
      paid: 500,
    });
    assert.equal(over.total, 100);
    assert.equal(over.paid, 100);
    assert.equal(over.balance, 0);

    const neg = invoiceTotals({
      items: [{ qty: 1, price: 100 }],
      paid: -50,
    });
    assert.equal(neg.paid, 0);
    assert.equal(neg.balance, 100);
  });

  it("handles empty items and zero total", () => {
    const t = invoiceTotals({ items: [], taxRate: 18, discount: 0, paid: 0 });
    assert.equal(t.subtotal, 0);
    assert.equal(t.tax, 0);
    assert.equal(t.total, 0);
    assert.equal(t.balance, 0);
  });
});

describe("paymentStatus / effectiveStatus", () => {
  it("derives unpaid, partial, paid, and zero-total", () => {
    assert.equal(paymentStatus(0, 100), "Unpaid");
    assert.equal(paymentStatus(40, 100), "Partial");
    assert.equal(paymentStatus(100, 100), "Paid");
    assert.equal(paymentStatus(0, 0), "Paid"); // nothing due
    assert.equal(paymentStatus(5, 0), "Paid");
  });

  it("effectiveStatus uses invoiceTotals (clamped paid)", () => {
    assert.equal(
      effectiveStatus({
        items: [{ qty: 1, price: 200 }],
        taxRate: 0,
        discount: 0,
        paid: 50,
      }),
      "Partial"
    );
    assert.equal(
      effectiveStatus({
        items: [{ qty: 1, price: 200 }],
        paid: 999,
      }),
      "Paid"
    );
    assert.equal(
      effectiveStatus({ items: [], paid: 0 }),
      "Paid"
    );
  });
});
