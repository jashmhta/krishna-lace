import { useState, useMemo } from "react";
import { useStore } from "../lib/useStore.js";
import { Field } from "../components/Field.jsx";
import { toast } from "../components/Toast.jsx";
import { createInvoice } from "../lib/store.js";
import { lineTotal, invoiceTotals } from "../lib/calc.js";
import { inr } from "../lib/format.js";
import { ArrowLeft, Plus, Trash, MagnifyingGlass, X, User } from "@phosphor-icons/react";

export function InvoiceEditor({ onClose, onCreated }) {
  const store = useStore();
  const { clients, products, settings } = store;

  const [clientId, setClientId] = useState("");
  const [walkin, setWalkin] = useState({ name: "", phone: "", address: "" });
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(settings.taxRate || 0);
  const [paid, setPaid] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const draft = { items, discount: Number(discount) || 0, taxRate: Number(taxRate) || 0, paid: Number(paid) || 0 };
  const totals = invoiceTotals(draft);

  const selectedClient = clients.find((c) => c.id === clientId) || null;

  const filteredProducts = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return products.filter((p) => !q || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q));
  }, [products, pickerQuery]);

  const addItem = (product) => {
    setItems((cur) => [
      ...cur,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        qty: 1,
        price: Number(product.price) || 0,
        discount: 0,
      },
    ]);
    setPicker(false);
    setPickerQuery("");
  };

  const addCustom = () => {
    setItems((cur) => [...cur, { productId: null, name: "", sku: "", unit: "Piece", qty: 1, price: 0, discount: 0 }]);
  };

  const updateItem = (i, patch) =>
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i) => setItems((cur) => cur.filter((_, idx) => idx !== i));

  const save = () => {
    const validItems = items.filter((it) => it.name.trim() && Number(it.qty) > 0);
    if (validItems.length === 0) { toast("Add at least one item", "error"); return; }

    let client = null;
    if (clientId) {
      const c = selectedClient;
      if (!c) { toast("Selected client no longer exists", "error"); return; }
      client = { name: c.name, phone: c.phone, address: c.address, gstin: c.gstin };
    } else if (walkin.name.trim()) {
      client = { name: walkin.name.trim(), phone: walkin.phone, address: walkin.address, gstin: "" };
    } else {
      client = { name: "Walk-in customer", phone: "", address: "", gstin: "" };
    }

    try {
      const inv = createInvoice({
        clientId: clientId || null,
        client,
        items: validItems,
        discount: Number(discount) || 0,
        taxRate: Number(taxRate) || 0,
        paid: Number(paid) || 0,
        date,
        notes: notes.trim(),
      });
      toast("Invoice created");
      onCreated(inv.id);
    } catch (err) {
      toast(err?.message || "Could not create invoice", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-paper overflow-y-auto animate-fade">
      <div className="max-w-[860px] mx-auto px-3 sm:px-6 py-5 sm:py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink transition min-h-[44px]">
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="text-lg font-semibold text-ink order-first w-full xs:w-auto xs:order-none text-center xs:text-left">New Invoice</h1>
          <button onClick={save} className="btn-primary btn-sm">Save invoice</button>
        </div>

        <div className="space-y-5">
          {/* Customer + date */}
          <section className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Customer</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Select client" hint="Or leave empty for walk-in">
                <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Walk-in customer</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Invoice date">
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>

            {!clientId && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="Customer name">
                  <input className="input" value={walkin.name} onChange={(e) => setWalkin({ ...walkin, name: e.target.value })} placeholder="Walk-in customer" />
                </Field>
                <Field label="Phone (for WhatsApp)">
                  <input className="input tnum" value={walkin.phone} onChange={(e) => setWalkin({ ...walkin, phone: e.target.value })} placeholder="98765 43210" />
                </Field>
              </div>
            )}
            {selectedClient && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-surface-2/60">
                <div className="grid place-items-center w-9 h-9 rounded-full bg-surface text-brand-ink font-semibold text-sm">
                  <User size={16} weight="duotone" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-ink">{selectedClient.name}</p>
                  <p className="text-faint text-xs">{selectedClient.phone}{selectedClient.address ? ` · ${selectedClient.address}` : ""}</p>
                </div>
              </div>
            )}
          </section>

          {/* Items */}
          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">Items</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setPicker(true)} className="btn-soft btn-sm"><Plus size={15} weight="bold" /> From stock</button>
                <button onClick={addCustom} className="btn-outline btn-sm"><Plus size={15} weight="bold" /> Custom item</button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center rounded-xl border-2 border-dashed border-line">
                <p className="text-sm text-muted">No items yet.</p>
                <p className="text-xs text-faint mt-1">Add products from your stock or a custom item.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, i) => (
                  <ItemRow key={i} it={it} i={i} onChange={updateItem} onRemove={removeItem} />
                ))}
              </div>
            )}
          </section>

          {/* Totals + payment */}
          <section className="card p-4 sm:p-5">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Field label="Discount on invoice">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                    <input type="number" min="0" className="input tnum pl-8" value={discount} inputMode="numeric" onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                  </div>
                </Field>
                <Field label="GST / Tax rate (%)">
                  <input type="number" min="0" max="100" className="input tnum" value={taxRate} inputMode="numeric" onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
                </Field>
                <Field label="Amount paid" hint="Leave 0 if unpaid">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                    <input type="number" min="0" className="input tnum pl-8" value={paid} inputMode="numeric" onChange={(e) => setPaid(e.target.value)} placeholder="0" />
                  </div>
                </Field>
              </div>

              <div className="rounded-xl bg-surface-2/60 p-4 space-y-2.5 self-start">
                <Row label="Subtotal" value={inr(totals.subtotal)} />
                {totals.tax > 0 && <Row label={`Tax (${taxRate}%)`} value={inr(totals.tax)} />}
                {totals.discount > 0 && <Row label="Discount" value={"- " + inr(totals.discount)} />}
                <div className="border-t hairline pt-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-xl font-semibold text-ink tnum">{inr(totals.total)}</span>
                </div>
                <Row label="Paid" value={inr(totals.paid)} muted />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-alert">Balance due</span>
                  <span className="text-base font-semibold text-alert tnum">{inr(totals.balance)}</span>
                </div>
              </div>
            </div>

            <Field label="Notes" className="mt-4" hint="Shown on the invoice, e.g. delivery or payment terms">
              <textarea className="input min-h-[60px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the customer" />
            </Field>
          </section>
        </div>
      </div>

      {/* Product picker */}
      {picker && (
        <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade" onClick={() => setPicker(false)} />
          <div className="relative w-full sm:max-w-lg card shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45)] animate-rise max-h-[80dvh] flex flex-col overflow-hidden rounded-b-none sm:rounded-b-[18px]">
            <div className="flex items-center justify-between px-5 py-4 border-b hairline">
              <h3 className="font-semibold text-ink">Pick from stock</h3>
              <button onClick={() => setPicker(false)} className="grid place-items-center w-8 h-8 rounded-lg text-faint hover:bg-surface-2"><X size={18} /></button>
            </div>
            <div className="px-5 py-3 border-b hairline">
              <div className="relative">
                <MagnifyingGlass size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input autoFocus className="input pl-10" value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Search products…" />
              </div>
            </div>
            <div className="overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No products found.</p>
              ) : filteredProducts.map((p) => (
                <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 text-left transition">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 overflow-hidden grid place-items-center shrink-0">
                    {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-faint text-xs tnum">{p.stock}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-xs text-faint">{p.category} · {p.stock} {p.unit} in stock</p>
                  </div>
                  <span className="text-sm font-semibold text-ink tnum">{inr(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ it, i, onChange, onRemove }) {
  const lt = lineTotal(it);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-xl bg-surface-2/40">
      <div className="flex-1 min-w-0">
        <input
          className="input py-2"
          value={it.name}
          onChange={(e) => onChange(i, { name: e.target.value })}
          placeholder="Item name"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5">
          <input type="number" min="0" step="any" className="input py-2 w-16 tnum text-center" value={it.qty}
            onChange={(e) => onChange(i, { qty: e.target.value })} aria-label="Quantity" inputMode="numeric" />
          <input type="number" min="0" step="any" className="input py-2 w-24 tnum text-right" value={it.price}
            onChange={(e) => onChange(i, { price: e.target.value })} aria-label="Price per unit" inputMode="numeric" />
        </div>
        <span className="flex-1 sm:w-24 sm:flex-none text-right text-sm font-semibold text-ink tnum">{inr(lt)}</span>
        <button onClick={() => onRemove(i)} className="grid place-items-center w-9 h-9 min-h-[40px] rounded-lg text-faint hover:bg-danger-soft hover:text-danger transition shrink-0" aria-label="Remove item">
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? "text-muted" : "text-ink-soft"}`}>{label}</span>
      <span className={`text-sm font-medium tnum ${muted ? "text-muted" : "text-ink"}`}>{value}</span>
    </div>
  );
}
