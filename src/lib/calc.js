export function lineTotal(it) {
  const qty = Number(it.qty) || 0;
  const price = Number(it.price) || 0;
  const disc = Number(it.discount) || 0;
  return Math.max(0, qty * price - disc);
}

export function invoiceTotals(inv) {
  const subtotal = (inv.items || []).reduce((s, it) => s + lineTotal(it), 0);
  const tax = (subtotal * (Number(inv.taxRate) || 0)) / 100;
  const discount = Number(inv.discount) || 0;
  const total = Math.max(0, subtotal + tax - discount);
  const paid = Math.min(Math.max(0, Number(inv.paid) || 0), total);
  const balance = Math.max(0, total - paid);
  return { subtotal, tax, discount, total, paid, balance };
}

/** Derive invoice status from paid amount vs total. */
export function paymentStatus(paid, total) {
  const p = Math.max(0, Number(paid) || 0);
  const t = Math.max(0, Number(total) || 0);
  if (t <= 0) return "Paid"; // nothing due
  if (p >= t) return "Paid";
  if (p > 0) return "Partial";
  return "Unpaid";
}

/** Effective status from invoice math (preferred over stored status when they diverge). */
export function effectiveStatus(inv) {
  const { paid, total } = invoiceTotals(inv);
  return paymentStatus(paid, total);
}

export function statusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return { bg: "bg-money-soft", text: "text-money", dot: "bg-money" };
  if (s === "partial") return { bg: "bg-alert-soft", text: "text-alert", dot: "bg-alert" };
  return { bg: "bg-surface-2", text: "text-muted", dot: "bg-faint" };
}
