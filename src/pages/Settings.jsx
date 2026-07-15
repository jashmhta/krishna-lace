import { useState, useEffect } from "react";
import { useStore } from "../lib/useStore.js";
import { Field } from "../components/Field.jsx";
import { toast } from "../components/Toast.jsx";
import { updateSettings, clearAllData, syncFromAPI, isCloudEnabled } from "../lib/store.js";
import { exportProducts, exportClients, exportInvoices } from "../lib/excel.js";
import { confirmAction } from "../lib/confirm.js";
import {
  Storefront, Receipt, Database, Trash, FileArrowDown, Scissors, FloppyDisk,
  CloudCheck, CloudSlash, ArrowClockwise,
} from "@phosphor-icons/react";

export default function Settings() {
  const store = useStore();
  const s = store.settings;
  const [form, setForm] = useState({ ...s });
  const [cloud, setCloud] = useState(isCloudEnabled());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setCloud(isCloudEnabled());
    const t = setInterval(() => setCloud(isCloudEnabled()), 3000);
    return () => clearInterval(t);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateSettings({
      ...form,
      invoiceStart: Number(form.invoiceStart) || s.invoiceStart,
      taxRate: Number(form.taxRate) || 0,
      lowStockDefault: Number(form.lowStockDefault) || 10,
    });
    toast("Settings saved");
  };

  const clearData = () =>
    confirmAction({
      title: "Erase all data?",
      message: "Every product, client and invoice on this device will be permanently deleted. This cannot be undone. Export a backup first if needed.",
      confirmLabel: "Erase everything",
      onConfirm: () => { clearAllData(); toast("All data cleared", "info"); window.location.reload(); },
    });

  return (
    <div className="space-y-6 animate-fade max-w-3xl">
      <header>
        <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">Settings</h1>
        <p className="text-sm text-muted mt-1">Your business details and invoice preferences</p>
      </header>

      {/* Business profile */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-ink text-white"><Storefront size={18} weight="duotone" /></div>
          <div>
            <h2 className="text-base font-semibold text-ink">Business profile</h2>
            <p className="text-xs text-faint">Shown on every invoice you send</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Business name"><input className="input" value={form.business} onChange={(e) => set("business", e.target.value)} /></Field>
            <Field label="Tagline"><input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          </div>
          <Field label="Address"><textarea className="input min-h-[64px] resize-none" value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone"><input className="input tnum" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" /></Field>
            <Field label="Email" hint="Optional"><input className="input" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="GSTIN" hint="Optional"><input className="input" value={form.gstin} onChange={(e) => set("gstin", e.target.value)} /></Field>
            <Field label="State"><input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
          </div>
        </div>
      </section>

      {/* Invoice preferences */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-soft text-brand-ink"><Receipt size={18} weight="duotone" /></div>
          <div>
            <h2 className="text-base font-semibold text-ink">Invoice preferences</h2>
            <p className="text-xs text-faint">Defaults used when you create invoices</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Invoice prefix"><input className="input" value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></Field>
          <Field label="Next number" hint="Auto-increments"><input type="number" className="input tnum" value={form.invoiceStart} onChange={(e) => set("invoiceStart", e.target.value)} /></Field>
          <Field label="Default GST %" hint="0 = no tax"><input type="number" min="0" max="100" className="input tnum" value={form.taxRate} onChange={(e) => set("taxRate", e.target.value)} /></Field>
        </div>
        <Field label="Default low-stock alert level" className="mt-4" hint="Used when adding new products">
          <input type="number" min="0" className="input tnum sm:max-w-xs" value={form.lowStockDefault} onChange={(e) => set("lowStockDefault", e.target.value)} />
        </Field>
      </section>

      <button onClick={save} className="btn-primary"><FloppyDisk size={17} /> Save settings</button>

      {/* Data management */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-surface-2 text-ink-soft"><Database size={18} weight="duotone" /></div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-ink">Your data</h2>
            <p className="text-xs text-faint">{cloud ? "Synced to cloud & this device" : "Stored on this device only"}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${cloud ? "bg-money-soft text-money" : "bg-surface-2 text-faint"}`}>
            {cloud ? <><CloudCheck size={13} weight="fill" /> Cloud</> : <><CloudSlash size={13} /> Local only</>}
          </span>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <button
            onClick={async () => { setSyncing(true); await syncFromAPI(); setCloud(isCloudEnabled()); setSyncing(false); toast(cloud ? "Synced from cloud" : "Cloud not available yet"); }}
            className="btn-outline justify-start"
            disabled={syncing}
          >
            <ArrowClockwise size={17} className={syncing ? "animate-spin" : ""} /> Sync now
          </button>
          <button onClick={() => exportProducts(store.products)} className="btn-outline justify-start">
            <FileArrowDown size={17} /> Export stock
          </button>
          <button onClick={() => exportClients(store.clients)} className="btn-outline justify-start">
            <FileArrowDown size={17} /> Export clients
          </button>
          <button onClick={() => exportInvoices(store.invoices)} className="btn-outline justify-start">
            <FileArrowDown size={17} /> Export invoices
          </button>
        </div>
        <p className="text-xs text-faint mt-3">{cloud ? "Data syncs to your Postgres database automatically. Export regularly as an extra backup." : "Export regularly as a backup. Add a Postgres database from the Vercel dashboard to enable cloud sync across devices."}</p>
      </section>

      {/* Danger zone */}
      <section className="card p-5 sm:p-6 border-danger/30">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-danger-soft text-danger"><Trash size={18} weight="duotone" /></div>
          <div>
            <h2 className="text-base font-semibold text-ink">Danger zone</h2>
            <p className="text-xs text-faint">Reset the app and start fresh</p>
          </div>
        </div>
        <button onClick={clearData} className="btn-danger"><Trash size={16} /> Erase all data</button>
      </section>

      <footer className="text-center py-4">
        <div className="inline-flex items-center gap-2 text-faint text-xs">
          <Scissors size={14} /> Krishna Lace House · Stock &amp; Billing
        </div>
      </footer>
    </div>
  );
}
