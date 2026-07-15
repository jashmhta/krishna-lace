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
  const paid = Math.min(Number(inv.paid) || 0, total);
  const balance = Math.max(0, total - paid);
  return { subtotal, tax, discount, total, paid, balance };
}

export function statusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return { bg: "bg-money-soft", text: "text-money", dot: "bg-money" };
  if (s === "partial") return { bg: "bg-alert-soft", text: "text-alert", dot: "bg-alert" };
  return { bg: "bg-surface-2", text: "text-muted", dot: "bg-faint" };
}
