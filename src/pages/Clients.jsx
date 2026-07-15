import { useState, useMemo, useRef } from "react";
import { useStore } from "../lib/useStore.js";
import { SearchInput } from "../components/SearchInput.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Modal } from "../components/Modal.jsx";
import { Field } from "../components/Field.jsx";
import { Avatar } from "../components/Bits.jsx";
import { confirmAction } from "../lib/confirm.js";
import { toast } from "../components/Toast.jsx";
import { addClient, updateClient, removeClient } from "../lib/store.js";
import { exportClients } from "../lib/excel.js";
import { waNumber } from "../lib/format.js";
import {
  Plus, PencilSimple, Trash, Users, WhatsappLogo, Phone, FileArrowDown,
} from "@phosphor-icons/react";

export default function Clients() {
  const store = useStore();
  const { clients } = store;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => `${c.name} ${c.phone} ${c.address} ${c.email}`.toLowerCase().includes(q));
  }, [clients, query]);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, gstin: c.gstin }); setOpen(true); };

  const submit = () => {
    if (!form.name.trim()) { toast("Enter a client name", "error"); return; }
    if (editing) { updateClient(editing.id, form); toast("Client updated"); }
    else { addClient(form); toast("Client added"); }
    setOpen(false);
  };

  const askDelete = (c) =>
    confirmAction({
      title: "Remove client?",
      message: `"${c.name}" will be removed. Their old invoices will be kept.`,
      confirmLabel: "Remove",
      onConfirm: () => {
        const snapshot = { ...c };
        removeClient(c.id);
        toast("Client removed", "success", {
          onClick: () => { addClient(snapshot); toast("Client restored"); },
        });
      },
    });

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">Clients</h1>
          <p className="text-sm text-muted mt-1">{clients.length} customers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportClients(clients)} className="btn-outline btn-sm">
            <FileArrowDown size={16} /> Export
          </button>
          <button onClick={openAdd} className="btn-primary btn-sm">
            <Plus size={16} weight="bold" /> Add client
          </button>
        </div>
      </header>

      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, phone or area" className="sm:max-w-sm" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title={clients.length ? "No matching clients" : "No clients yet"}
          message={clients.length ? "Try another search." : "Add your customers to send them invoices quickly."}
          action={clients.length ? null : <button onClick={openAdd} className="btn-primary btn-sm"><Plus size={15} weight="bold" /> Add client</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-3.5 hover:border-line-strong transition-colors">
              <Avatar name={c.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink truncate">{c.name}</p>
                <p className="text-[12px] text-muted truncate mt-0.5">
                  {c.phone ? formatPhone(c.phone) : "No phone"} · {c.address || "No address"}
                </p>
                {c.gstin && <p className="text-[11px] text-faint mt-0.5">GSTIN: {c.gstin}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {c.phone && (
                  <a
                    href={`https://wa.me/${waNumber(c.phone)}`}
                    target="_blank" rel="noreferrer"
                    className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-money hover:bg-money-soft transition"
                    aria-label={`Message ${c.name} on WhatsApp`}
                  >
                    <WhatsappLogo size={18} weight="fill" />
                  </a>
                )}
                <button onClick={() => openEdit(c)} className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-ink-soft hover:bg-surface-2 transition" aria-label={`Edit ${c.name}`}>
                  <PencilSimple size={16} />
                </button>
                <button onClick={() => askDelete(c)} className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-faint hover:bg-danger-soft hover:text-danger transition" aria-label={`Remove ${c.name}`}>
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editing ? "Edit Client" : "Add Client"}
        subtitle={editing ? "Update customer details" : "Save a customer for quick invoicing"}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={submit} className="btn-primary">{editing ? "Save changes" : "Add client"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Client / shop name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sharma Garments" />
          </Field>
          <Field label="Phone (WhatsApp)" hint="Used to send invoices on WhatsApp">
            <input className="input tnum" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
          </Field>
          <Field label="Address">
            <textarea className="input min-h-[72px] resize-none" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shop / area, city" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" hint="Optional">
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="shop@email.com" />
            </Field>
            <Field label="GSTIN" hint="Optional">
              <input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="27ABCDE1234F1Z5" />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function emptyForm() { return { name: "", phone: "", email: "", address: "", gstin: "" }; }
function formatPhone(p) {
  const s = (p || "").replace(/\D/g, "");
  if (s.length === 10) return `${s.slice(0,5)} ${s.slice(5)}`;
  return p;
}
