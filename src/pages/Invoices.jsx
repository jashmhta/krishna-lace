import { useState, useMemo } from "react";
import { useStore } from "../lib/useStore.js";
import { SearchInput } from "../components/SearchInput.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { InvoiceEditor } from "./InvoiceEditor.jsx";
import { InvoiceView } from "./InvoiceView.jsx";
import { StatusDot } from "../components/Bits.jsx";
import { invoiceTotals, statusColor } from "../lib/calc.js";
import { inr, shortDate, waNumber, relTime } from "../lib/format.js";
import { exportInvoices } from "../lib/excel.js";
import { toast } from "../components/Toast.jsx";
import {
  Plus, Receipt, WhatsappLogo, FileArrowDown, CaretRight,
} from "@phosphor-icons/react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "partial", label: "Partial" },
  { key: "paid", label: "Paid" },
];

export default function Invoices() {
  const store = useStore();
  const { invoices } = store;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list"); // list | editor | view
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (q && !`${inv.number} ${inv.client?.name || ""} ${inv.client?.phone || ""}`.toLowerCase().includes(q)) return false;
      const st = (inv.status || "unpaid").toLowerCase();
      if (filter === "all") return true;
      return st === filter;
    });
  }, [invoices, query, filter]);

  const totals = useMemo(() => {
    const revenue = invoices.reduce((s, i) => s + invoiceTotals(i).total, 0);
    const due = invoices.reduce((s, i) => s + invoiceTotals(i).balance, 0);
    return { revenue, due };
  }, [invoices]);

  const openNew = () => { setSelected(null); setView("editor"); };
  const openView = (id) => { setSelected(id); setView("view"); };

  if (view === "editor") {
    return <InvoiceEditor onClose={() => setView("list")} onCreated={(id) => { setSelected(id); setView("view"); }} />;
  }
  if (view === "view" && selected) {
    return <InvoiceView id={selected} onClose={() => setView("list")} />;
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-muted mt-1">
            {invoices.length} invoices · <span className="text-money font-medium">{inr(totals.revenue)}</span> billed ·
            <span className="text-alert font-medium"> {inr(totals.due)}</span> due
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportInvoices(invoices)} className="btn-outline btn-sm" disabled={!invoices.length}>
            <FileArrowDown size={16} /> Export
          </button>
          <button onClick={openNew} className="btn-primary btn-sm">
            <Plus size={16} weight="bold" /> New invoice
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by number, client or phone" className="sm:max-w-xs" />
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? invoices.length : invoices.filter((i) => (i.status || "unpaid").toLowerCase() === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition active:scale-95 ${
                  filter === f.key ? "bg-ink text-white" : "bg-surface border hairline text-ink-soft hover:bg-surface-2"
                }`}
              >
                {f.label} <span className={`tnum text-[11px] ${filter === f.key ? "text-white/70" : "text-faint"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={26} />}
          title={invoices.length ? "No matching invoices" : "No invoices yet"}
          message={invoices.length ? "Try another search or filter." : "Create your first invoice in seconds — pick a customer, add items, and send it on WhatsApp."}
          action={invoices.length ? null : <button onClick={openNew} className="btn-primary btn-sm"><Plus size={15} weight="bold" /> Create invoice</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.map((inv) => {
              const t = invoiceTotals(inv);
              const sc = statusColor(inv.status);
              return (
                <li key={inv.id}>
                  <div className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-surface-2/50 transition group min-h-[56px]">
                    <button onClick={() => openView(inv.id)} className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 text-left">
                      <div className="grid place-items-center w-10 h-10 rounded-xl bg-surface-2 text-ink-soft shrink-0">
                        <Receipt size={18} weight="duotone" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-[15px] font-medium text-ink truncate">{inv.client?.name || "Walk-in customer"}</p>
                        <p className="text-[11px] text-faint mt-0.5 tnum truncate">
                          {inv.number} · {shortDate(inv.date)} · {inv.items.length} items
                        </p>
                      </div>
                    </button>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-[15px] font-semibold text-ink tnum">{inr(t.total)}</p>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${sc.text} mt-0.5`}>
                        <StatusDot color={sc.dot} /> {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {inv.client?.phone && (
                        <a
                          href={waLink(inv)} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-money hover:bg-money-soft transition"
                          aria-label={`Send invoice ${inv.number} on WhatsApp`}
                        >
                          <WhatsappLogo size={18} weight="fill" />
                        </a>
                      )}
                      <button
                        onClick={() => openView(inv.id)}
                        className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-faint hover:bg-surface-2 hover:text-ink transition"
                        aria-label={`Open invoice ${inv.number}`}
                      >
                        <CaretRight size={18} weight="bold" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function waLink(inv) {
  const items = inv.items.map((it) => `• ${it.name} — ${it.qty} × ${inr(it.price)}`).join("\n");
  const t = invoiceTotals(inv);
  const msg = `Invoice ${inv.number}\n${inv.client?.name}\n\n${items}\n\nTotal: ${inr(t.total)}\nBalance: ${inr(t.balance)}`;
  return `https://wa.me/${waNumber(inv.client?.phone)}?text=${encodeURIComponent(msg)}`;
}
