import { useState, useMemo, useRef } from "react";
import { useStore } from "../lib/useStore.js";
import { SearchInput } from "../components/SearchInput.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ProductForm } from "./ProductForm.jsx";
import { confirmAction } from "../lib/confirm.js";
import { toast } from "../components/Toast.jsx";
import { inr, num } from "../lib/format.js";
import { adjustStock, removeProduct, addProduct, setProducts, updateProduct } from "../lib/store.js";
import {
  importProductsFromFile, exportProducts, downloadInventoryTemplate,
} from "../lib/excel.js";
import {
  Plus, FileArrowUp, FileArrowDown, DotsThree, Pencil, Trash,
  Minus, Stack, Warning,
} from "@phosphor-icons/react";

export default function Inventory() {
  const store = useStore();
  const { products } = store;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | category
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const importRef = useRef(null);

  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const lowCount = products.filter((p) => Number(p.stock) <= Number(p.lowStock || 0)).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q))) return false;
      if (filter === "low") return Number(p.stock) <= Number(p.lowStock || 0);
      if (filter !== "all" && p.category !== filter) return false;
      return true;
    });
  }, [products, query, filter]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };
  const askDelete = (p) =>
    confirmAction({
      title: "Delete product?",
      message: `"${p.name}" will be removed from your stock. Invoices already made will stay unchanged.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        const snapshot = { ...p };
        removeProduct(p.id);
        toast("Product deleted", "success", {
          onClick: () => { addProduct(snapshot); toast("Product restored"); },
        });
      },
    });

  const onImport = async (file) => {
    try {
      const rows = await importProductsFromFile(file);
      if (!rows.length) { toast("No products found in file", "error"); return; }
      rows.forEach((r) => addProduct(r));
      toast(`${rows.length} products imported`);
    } catch {
      toast("Could not import file. Use the template format.", "error");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">Stock</h1>
          <p className="text-sm text-muted mt-1">{products.length} items · {lowCount} low on stock</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => downloadInventoryTemplate()} className="btn-outline btn-sm hidden md:inline-flex">
            Template
          </button>
          <button onClick={() => importRef.current?.click()} className="btn-outline btn-sm">
            <FileArrowUp size={16} /> Import
          </button>
          <button onClick={() => exportProducts(products)} className="btn-outline btn-sm">
            <FileArrowDown size={16} /> Export
          </button>
          <button onClick={openAdd} className="btn-primary btn-sm">
            <Plus size={16} weight="bold" /> Add
          </button>
          <input
            ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }}
          />
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, code or category" className="sm:max-w-xs" />
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          <Chip active={filter === "low"} onClick={() => setFilter("low")} alert={lowCount > 0}>
            <Warning size={14} weight="fill" /> Low stock {lowCount > 0 && `(${lowCount})`}
          </Chip>
          {categories.filter((c) => c !== "all").map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stack size={26} />}
          title={products.length ? "No matching items" : "Your stock is empty"}
          message={products.length ? "Try a different search or filter." : "Add your first product or import from Excel to get started."}
          action={
            products.length ? null : (
              <div className="flex items-center gap-2">
                <button onClick={openAdd} className="btn-primary btn-sm"><Plus size={15} weight="bold" /> Add product</button>
                <button onClick={() => importRef.current?.click()} className="btn-outline btn-sm"><FileArrowUp size={15} /> Import Excel</button>
              </div>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} onEdit={openEdit} onDelete={askDelete} />
          ))}
        </div>
      )}

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </div>
  );
}

function Chip({ active, onClick, children, alert }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition active:scale-95 ${
        active ? "bg-ink text-white" : alert ? "bg-alert-soft text-alert" : "bg-surface border hairline text-ink-soft hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function ProductCard({ p, onEdit, onDelete }) {
  const low = Number(p.stock) <= Number(p.lowStock || 0);
  const out = Number(p.stock) <= 0;
  const [menu, setMenu] = useState(false);

  return (
    <div className="card overflow-hidden group hover:border-line-strong transition-colors">
      <div className="flex gap-3 p-3.5">
        {/* Photo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-2 overflow-hidden shrink-0 grid place-items-center">
          {p.photo ? (
            <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <Stack size={20} className="text-faint" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm sm:text-[15px] font-semibold text-ink leading-snug truncate">{p.name}</p>
              <p className="text-[11px] text-faint mt-0.5">{p.category}{p.sku ? ` · ${p.sku}` : ""}</p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setMenu((v) => !v)}
                onBlur={() => setTimeout(() => setMenu(false), 150)}
                className="grid place-items-center w-9 h-9 min-h-[40px] rounded-lg text-faint hover:bg-surface-2 hover:text-ink transition"
                aria-label={`Options for ${p.name}`}
              >
                <DotsThree size={20} weight="bold" />
              </button>
              {menu && (
                <div className="absolute right-0 top-10 z-20 w-36 card shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] py-1 animate-pop">
                  <button onMouseDown={() => onEdit(p)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-soft hover:bg-surface-2 text-left min-h-[40px]">
                    <Pencil size={15} /> Edit
                  </button>
                  <button onMouseDown={() => onDelete(p)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger hover:bg-danger-soft text-left min-h-[40px]">
                    <Trash size={15} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-lg font-semibold text-ink tnum">{inr(p.price)}</p>
              <p className="text-[11px] text-faint">per {p.unit}</p>
            </div>
            <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${
              out ? "bg-danger-soft text-danger" : low ? "bg-alert-soft text-alert" : "bg-money-soft text-money"
            }`}>
              {out ? "Out of stock" : low ? `Low · ${num(p.stock)} ${p.unit}` : `${num(p.stock)} ${p.unit}`}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stock adjust */}
      <div className="flex items-center justify-between border-t hairline px-2 py-2 bg-surface-2/40">
        <button
          onClick={() => { adjustStock(p.id, -1); }}
          className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-ink-soft hover:bg-surface transition active:scale-90"
          aria-label="Reduce stock by 1"
        >
          <Minus size={16} weight="bold" />
        </button>
        <span className="text-[13px] font-semibold text-ink tnum">{num(p.stock)} {p.unit}</span>
        <button
          onClick={() => { adjustStock(p.id, 1); }}
          className="grid place-items-center w-10 h-10 min-h-[40px] rounded-lg text-ink-soft hover:bg-surface transition active:scale-90"
          aria-label="Add 1 to stock"
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
