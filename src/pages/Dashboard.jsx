import { useMemo } from "react";
import { useStore } from "../lib/useStore.js";
import { invoiceTotals, statusColor } from "../lib/calc.js";
import { inr, num, relTime, shortDate } from "../lib/format.js";
import { StatusDot } from "../components/Bits.jsx";
import {
  TrendUp, Stack, Warning, Receipt, Plus,
  WhatsappLogo, Package, Coins, Users,
} from "@phosphor-icons/react";

export default function Dashboard({ navigate }) {
  const store = useStore();
  const { products, clients, invoices, settings } = store;

  const stats = useMemo(() => {
    const revenue = invoices.reduce((s, inv) => s + invoiceTotals(inv).total, 0);
    const pending = invoices
      .filter((i) => (i.status || "").toLowerCase() !== "paid")
      .reduce((s, inv) => s + invoiceTotals(inv).balance, 0);
    const stockValue = products.reduce((s, p) => s + (Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
    const lowStock = products.filter((p) => Number(p.stock) <= Number(p.lowStock || 0));
    return { revenue, pending, stockValue, lowStock };
  }, [invoices, products]);

  // revenue for last 6 months
  const chart = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const total = invoices
        .filter((inv) => {
          const id = new Date(inv.date);
          return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
        })
        .reduce((s, inv) => s + invoiceTotals(inv).total, 0);
      months.push({ label, total });
    }
    const max = Math.max(1, ...months.map((m) => m.total));
    return { months, max };
  }, [invoices]);

  const recent = invoices.slice(0, 5);

  const cards = [
    {
      label: "Total Revenue", value: inr(stats.revenue),
      icon: Coins, tint: "bg-money-soft text-money",
      sub: `${invoices.length} invoices`,
    },
    {
      label: "Stock Value", value: inr(stats.stockValue),
      icon: Package, tint: "bg-brand-soft text-brand-ink",
      sub: `${products.length} items`,
    },
    {
      label: "Pending Dues", value: inr(stats.pending),
      icon: TrendUp, tint: "bg-alert-soft text-alert",
      sub: invoices.filter((i) => (i.status || "").toLowerCase() !== "paid").length + " unpaid",
    },
    {
      label: "Low Stock", value: num(stats.lowStock.length) + " items",
      icon: Warning, tint: "bg-danger-soft text-danger",
      sub: stats.lowStock.length ? "Needs restock" : "All good",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-7 animate-fade">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{greeting()}</p>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink mt-0.5 truncate">
            {settings.business}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate("inventory")} className="btn-outline btn-sm">
            <Stack size={16} /> Add Stock
          </button>
          <button onClick={() => navigate("invoices")} className="btn-primary btn-sm">
            <Plus size={16} weight="bold" /> New Invoice
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4 sm:p-5 hover:border-line-strong transition-colors overflow-hidden">
              <div className="flex items-center justify-between">
                <div className={`grid place-items-center w-9 h-9 rounded-xl ${c.tint} shrink-0`}>
                  <Icon size={18} weight="duotone" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-semibold text-ink mt-3 tnum tracking-tight truncate">{c.value}</p>
              <p className="text-[12px] sm:text-[13px] text-muted mt-0.5">{c.label}</p>
              <p className="text-[11px] text-faint mt-1.5 truncate">{c.sub}</p>
            </div>
          );
        })}
      </section>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Revenue chart */}
        <section className="card p-4 sm:p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-ink">Revenue</h2>
              <p className="text-xs text-faint mt-0.5">Last 6 months</p>
            </div>
            <span className="text-[13px] font-semibold text-money tnum">{inr(chart.months.reduce((s, m) => s + m.total, 0))}</span>
          </div>
          <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-32 sm:h-40">
            {chart.months.map((m, i) => {
              const h = Math.max(4, (m.total / chart.max) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex items-end justify-center h-full">
                    <div
                      className="w-full max-w-[42px] rounded-t-lg bg-brand/85 group-hover:bg-brand transition-all duration-300"
                      style={{ height: `${h}%` }}
                      title={inr(m.total)}
                    />
                  </div>
                  <span className="text-[11px] text-faint font-medium">{m.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Low stock alerts */}
        <section className="card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Warning size={18} weight="duotone" className="text-alert" />
              <h2 className="text-base font-semibold text-ink">Stock Alerts</h2>
            </div>
            {stats.lowStock.length > 0 && (
              <button onClick={() => navigate("inventory")} className="text-xs font-medium text-brand hover:underline">
                View all
              </button>
            )}
          </div>
          {stats.lowStock.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted">Everything is well stocked.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {stats.lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-danger-soft text-danger text-[11px] font-bold tnum shrink-0">
                    {p.stock}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{p.name}</p>
                    <p className="text-[11px] text-faint">{p.category} · {p.unit}</p>
                  </div>
                  <span className="text-[11px] text-alert font-medium">Low</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent invoices + clients */}
      <div className="grid lg:grid-cols-5 gap-4">
        <section className="card lg:col-span-3 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b hairline">
            <h2 className="text-base font-semibold text-ink">Recent Invoices</h2>
            <button onClick={() => navigate("invoices")} className="text-xs font-medium text-brand hover:underline">
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center px-6">
              <Receipt size={28} weight="duotone" className="text-faint mx-auto mb-2" />
              <p className="text-sm text-muted">No invoices yet.</p>
              <button onClick={() => navigate("invoices")} className="btn-brand btn-sm mt-4">
                <Plus size={15} weight="bold" /> Create first invoice
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((inv) => {
                const t = invoiceTotals(inv);
                const sc = statusColor(inv.status);
                return (
                  <li key={inv.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface-2/60 transition">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{inv.client?.name || "Walk-in customer"}</p>
                      <p className="text-[11px] text-faint mt-0.5">{inv.number} · {shortDate(inv.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-ink tnum">{inr(t.total)}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${sc.text} mt-0.5`}>
                        <StatusDot color={sc.dot} /> {inv.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b hairline">
            <div className="flex items-center gap-2">
              <Users size={18} weight="duotone" className="text-brand" />
              <h2 className="text-base font-semibold text-ink">Clients</h2>
            </div>
            <button onClick={() => navigate("clients")} className="text-xs font-medium text-brand hover:underline">
              View all
            </button>
          </div>
          {clients.length === 0 ? (
            <div className="py-12 text-center px-6">
              <p className="text-sm text-muted">No clients added.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {clients.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5">
                  <div className="grid place-items-center w-9 h-9 rounded-full bg-surface-2 text-ink-soft text-sm font-semibold shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                    <p className="text-[11px] text-faint truncate">{c.phone || c.address || "—"}</p>
                  </div>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "").replace(/^0/, "")}`}
                      target="_blank" rel="noreferrer"
                      className="grid place-items-center w-9 h-9 min-h-[40px] rounded-lg text-money hover:bg-money-soft transition"
                      aria-label={`WhatsApp ${c.name}`}
                    >
                      <WhatsappLogo size={17} weight="fill" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
