import { useState, useRef } from "react";
import { Modal } from "../components/Modal.jsx";
import { Field } from "../components/Field.jsx";
import { Camera, Trash, Image as ImageIcon } from "@phosphor-icons/react";
import { toast } from "../components/Toast.jsx";
import { addProduct, updateProduct } from "../lib/store.js";
import { useStore } from "../lib/useStore.js";

const UNITS = ["Meter", "Piece", "Roll", "Set", "Pair", "Kg", "Box", "Dozen"];
const CATEGORIES = ["Lace", "Border", "Fabric", "Dupatta", "Thread", "Button", "General"];

export function ProductForm({ open, onClose, editing }) {
  const store = useStore();
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(editing?.photo || "");
  const [form, setForm] = useState({
    name: editing?.name || "",
    sku: editing?.sku || "",
    category: editing?.category || "Lace",
    stock: editing?.stock ?? "",
    unit: editing?.unit || "Meter",
    cost: editing?.cost ?? "",
    price: editing?.price ?? "",
    lowStock: editing?.lowStock ?? store.settings.lowStockDefault ?? 10,
  });
  const [err, setErr] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onPhoto = (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast("Photo is too large (max 4MB)", "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Product name is required";
    if (form.cost === "" || Number(form.cost) < 0) e.cost = "Enter a cost price";
    if (form.price === "" || Number(form.price) < 0) e.price = "Enter a selling price";
    if (Object.keys(e).length) { setErr(e); return; }

    const data = {
      ...form,
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim() || "General",
      stock: Number(form.stock) || 0,
      cost: Number(form.cost) || 0,
      price: Number(form.price) || 0,
      lowStock: Number(form.lowStock) || 0,
      photo,
    };
    if (editing) {
      updateProduct(editing.id, data);
      toast("Product updated");
    } else {
      addProduct(data);
      toast("Product added to stock");
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Product" : "Add Product"}
      subtitle={editing ? "Update stock details" : "Add a new item to your stock"}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} className="btn-primary">{editing ? "Save changes" : "Add product"}</button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2 overflow-hidden grid place-items-center">
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={24} className="text-faint" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="label mb-2">Product photo</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()} className="btn-outline btn-sm">
                <Camera size={15} /> {photo ? "Change" : "Upload"}
              </button>
              {photo && (
                <button onClick={() => setPhoto("")} className="btn-ghost btn-sm text-danger">
                  <Trash size={15} /> Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </div>
        </div>

        <Field label="Product name" error={err.name}>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Flower Net Lace — White" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Code / SKU" hint="Optional">
            <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="L-101" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="In stock" hint="Current quantity">
            <input className="input tnum" type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" inputMode="numeric" />
          </Field>
          <Field label="Unit">
            <select className="select" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cost price" error={err.cost} hint="What you paid">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
              <input className="input tnum pl-8" type="number" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" inputMode="numeric" />
            </div>
          </Field>
          <Field label="Selling price" error={err.price} hint="What you charge">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
              <input className="input tnum pl-8" type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0" inputMode="numeric" />
            </div>
          </Field>
        </div>

        <Field label="Low stock alert at" hint="Warn when stock falls to this number">
          <input className="input tnum" type="number" min="0" value={form.lowStock} onChange={(e) => set("lowStock", e.target.value)} inputMode="numeric" />
        </Field>
      </div>
    </Modal>
  );
}
