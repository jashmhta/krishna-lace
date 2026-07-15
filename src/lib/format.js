// Indian Rupee formatting — clean, no decimals unless needed.
export function inr(n) {
  const v = Number(n) || 0;
  const rounded = Math.round(v * 100) / 100;
  const hasDec = rounded % 1 !== 0;
  return "₹" + (hasDec
    ? rounded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : rounded.toLocaleString("en-IN"));
}

export function num(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-IN");
}

export function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function relTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  const days = Math.floor(diff / day);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// Indian-style phone for wa.me: strip non-digits, drop leading 0, add 91 if 10 digits.
export function waNumber(raw) {
  let s = (raw || "").replace(/\D/g, "");
  if (s.startsWith("91") && s.length === 12) return s;
  if (s.length === 10) return "91" + s;
  if (s.startsWith("0")) s = s.slice(1);
  if (s.length === 10) return "91" + s;
  return s;
}
