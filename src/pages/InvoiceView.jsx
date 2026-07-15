import { useState } from "react";
import { useStore } from "../lib/useStore.js";
import { invoiceTotals, lineTotal, statusColor, effectiveStatus } from "../lib/calc.js";
import { inr, shortDate, waNumber } from "../lib/format.js";
import { updateInvoice, removeInvoice, recordPayment as storeRecordPayment } from "../lib/store.js";
import { toast } from "../components/Toast.jsx";
import { confirmAction } from "../lib/confirm.js";
import { Modal } from "../components/Modal.jsx";
import { Field } from "../components/Field.jsx";
import { StatusDot } from "../components/Bits.jsx";
import {
  ArrowLeft, Printer, WhatsappLogo, CheckCircle, CurrencyInr, Trash, Scissors,
  DotsThreeVertical,
} from "@phosphor-icons/react";

export function InvoiceView({ id, onClose }) {
  const store = useStore();
  const inv = store.invoices.find((x) => x.id === id);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  if (!inv) return null;
  const t = invoiceTotals(inv);
  const status = effectiveStatus(inv);
  const sc = statusColor(status);
  const s = store.settings;

  const sendWhatsApp = () => {
    const phone = inv.client?.phone;
    if (!phone) { toast("No phone number for this customer", "error"); return; }
    const lines = inv.items.map(
      (it) => `• ${it.name} — ${it.qty} ${it.unit || ""} × ${inr(it.price)} = ${inr(lineTotal(it))}`
    );
    const msg =
      `*${s.business}*\n${s.tagline}\n\n` +
      `*Invoice ${inv.number}*\nDate: ${shortDate(inv.date)}\n\n` +
      `Bill to: *${inv.client?.name || "Customer"}*\n\n` +
      `*Items*\n${lines.join("\n")}\n\n` +
      (t.discount ? `Discount: - ${inr(t.discount)}\n` : "") +
      (t.tax ? `Tax (${inv.taxRate}%): ${inr(t.tax)}\n` : "") +
      `*Total: ${inr(t.total)}*\n` +
      (t.paid ? `Paid: ${inr(t.paid)}\nBalance: ${inr(t.balance)}\n` : `Balance due: ${inr(t.balance)}\n`) +
      (inv.notes ? `\nNote: ${inv.notes}\n` : "") +
      `\nThank you for your business!`;
    const url = `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(msg)}`;
    if (navigator.share) {
      navigator.share({ title: `Invoice ${inv.number}`, url }).catch(() => window.open(url, "_blank"));
    } else {
      window.open(url, "_blank");
    }
  };

  const markPaid = () => {
    updateInvoice(inv.id, { paid: t.total });
    toast("Marked as paid");
  };

  const recordPayment = () => {
    const amt = Number(payAmount) || 0;
    if (amt <= 0) { toast("Enter an amount", "error"); return; }
    const { applied } = storeRecordPayment(inv.id, amt);
    if (applied <= 0) { toast("Nothing to record — balance is already settled", "error"); return; }
    setPayOpen(false);
    setPayAmount("");
    toast(`Recorded ${inr(applied)} payment`);
  };

  const askDelete = () => {
    setMenuOpen(false);
    confirmAction({
      title: "Delete invoice?",
      message: `Invoice ${inv.number} will be removed and stock quantities for linked products will be restored.`,
      confirmLabel: "Delete",
      onConfirm: () => { removeInvoice(inv.id); toast("Invoice deleted · stock restored"); onClose(); },
    });
  };

  const print = () => { setMenuOpen(false); window.print(); };

  return (
    <div className="fixed inset-0 z-[70] bg-paper overflow-y-auto animate-fade">
      {/* Action bar — responsive */}
      <div className="no-print sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b hairline">
        <div className="max-w-[820px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink transition shrink-0 min-h-[44px] px-2">
            <ArrowLeft size={18} /> <span className="hidden xs:inline">Back</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setPayOpen(true)} className="btn-outline btn-sm min-h-[40px]" title="Record payment">
              <CurrencyInr size={16} /> <span className="hidden sm:inline">Payment</span>
            </button>
            <button onClick={markPaid} className="btn-soft btn-sm min-h-[40px]" title="Mark as paid">
              <CheckCircle size={16} /> <span className="hidden lg:inline">Mark paid</span>
            </button>
            <button onClick={sendWhatsApp} className="btn-brand btn-sm min-h-[40px]" title="Send via WhatsApp">
              <WhatsappLogo size={16} weight="fill" /> <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button onClick={print} className="btn-primary btn-sm min-h-[40px]" title="Print invoice">
              <Printer size={16} /> <span className="hidden sm:inline">Print</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="grid place-items-center w-9 h-9 min-h-[40px] rounded-lg text-faint hover:bg-surface-2 hover:text-ink transition shrink-0"
                aria-label="More options"
              >
                <DotsThreeVertical size={18} weight="bold" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-20 w-44 card shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] py-1 animate-pop">
                  <button onMouseDown={askDelete} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger hover:bg-danger-soft text-left">
                    <Trash size={15} /> Delete invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable invoice */}
      <div className="print-area max-w-[820px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <div className="card p-5 sm:p-7 md:p-10 print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-ink text-white shrink-0">
                <Scissors size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-ink leading-tight">{s.business}</h1>
                <p className="text-xs text-muted">{s.tagline}</p>
                <p className="text-[11px] text-faint mt-1 max-w-[220px] leading-snug hidden sm:block">{s.address}</p>
                {s.phone && <p className="text-[11px] text-faint hidden sm:block">+91 {s.phone}</p>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">INVOICE</p>
              <p className="text-sm text-muted mt-1 tnum">{inv.number}</p>
              <p className="text-xs text-faint mt-0.5">{shortDate(inv.date)}</p>
              <span className={`no-print inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                <StatusDot color={sc.dot} /> {status}
              </span>
            </div>
          </div>

          {/* Bill to */}
          <div className="mt-6 sm:mt-8 grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Bill To</p>
              <p className="text-base font-semibold text-ink mt-1.5">{inv.client?.name || "Walk-in customer"}</p>
              {inv.client?.address && <p className="text-sm text-muted mt-0.5 leading-snug">{inv.client.address}</p>}
              {inv.client?.phone && <p className="text-sm text-muted">{inv.client.phone}</p>}
              {inv.client?.gstin && <p className="text-sm text-muted">GSTIN: {inv.client.gstin}</p>}
            </div>
            {(s.gstin || s.state) && (
              <div className="sm:text-right">
                {s.gstin && <p className="text-sm text-muted">GSTIN: <span className="text-ink font-medium">{s.gstin}</span></p>}
                {s.state && <p className="text-sm text-muted">State: <span className="text-ink font-medium">{s.state}</span></p>}
              </div>
            )}
          </div>

          {/* Items — table on desktop, cards on mobile */}
          <div className="mt-6 sm:mt-8">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-hidden rounded-xl border hairline">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-2 text-left">
                    <th className="px-4 py-3 font-semibold text-ink-soft text-[12px]">Item</th>
                    <th className="px-3 py-3 font-semibold text-ink-soft text-[12px] text-center w-20">Qty</th>
                    <th className="px-3 py-3 font-semibold text-ink-soft text-[12px] text-right w-28">Rate</th>
                    <th className="px-4 py-3 font-semibold text-ink-soft text-[12px] text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {inv.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-ink">
                        {it.name}
                        {it.sku && <span className="text-faint text-xs ml-2">{it.sku}</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-ink-soft tnum">{it.qty} {it.unit || ""}</td>
                      <td className="px-3 py-3 text-right text-ink-soft tnum">{inr(it.price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink tnum">{inr(lineTotal(it))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {inv.items.map((it, i) => (
                <div key={i} className="rounded-xl border hairline p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink leading-snug">{it.name}</p>
                      {it.sku && <p className="text-[11px] text-faint mt-0.5">{it.sku}</p>}
                    </div>
                    <p className="text-sm font-semibold text-ink tnum shrink-0">{inr(lineTotal(it))}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted tnum">
                    <span>{it.qty} {it.unit || ""}</span>
                    <span className="text-faint">×</span>
                    <span>{inr(it.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-ink font-medium tnum">{inr(t.subtotal)}</span>
              </div>
              {t.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Tax ({inv.taxRate || 0}%)</span>
                  <span className="text-ink font-medium tnum">{inr(t.tax)}</span>
                </div>
              )}
              {t.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Discount</span>
                  <span className="text-ink font-medium tnum">- {inr(t.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t hairline pt-2.5">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-xl font-semibold text-ink tnum">{inr(t.total)}</span>
              </div>
              {t.paid > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-money">Paid</span>
                    <span className="text-money font-medium tnum">{inr(t.paid)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-alert">Balance due</span>
                    <span className="font-semibold text-alert tnum">{inr(t.balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {inv.notes && (
            <div className="mt-8 pt-6 border-t hairline">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Notes</p>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{inv.notes}</p>
            </div>
          )}

          <div className="mt-8 sm:mt-10 pt-6 border-t hairline text-center">
            <p className="text-sm font-medium text-ink">Thank you for your business!</p>
            <p className="text-xs text-faint mt-1">{s.business}</p>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      <Modal
        open={payOpen} onClose={() => setPayOpen(false)}
        title="Record Payment" subtitle={`Balance due: ${inr(t.balance)}`}
        size="sm"
        footer={
          <>
            <button onClick={() => setPayOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={recordPayment} className="btn-primary">Record payment</button>
          </>
        }
      >
        <Field label="Amount received">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">₹</span>
            <input autoFocus type="number" min="0" className="input tnum pl-8" value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)} placeholder={String(t.balance)} inputMode="numeric" />
          </div>
        </Field>
        {t.balance > 0 && (
          <button
            onClick={() => setPayAmount(String(t.balance))}
            className="text-xs font-medium text-brand hover:underline mt-2"
          >
            Received full balance ({inr(t.balance)})
          </button>
        )}
      </Modal>
    </div>
  );
}
