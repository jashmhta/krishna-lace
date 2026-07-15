import { useEffect, useState } from "react";
import { CheckCircle, Warning, Info, X, ArrowUUpLeft } from "@phosphor-icons/react";

let pushFn = null;
const queue = [];

export function toast(message, type = "success", action = null) {
  const t = { message, type, action, id: Math.random().toString(36).slice(2) };
  if (pushFn) pushFn(t);
  else queue.push(t);
}

export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    pushFn = (t) => {
      setItems((cur) => [...cur, t]);
      const duration = t.action ? 5000 : 3200;
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), duration);
    };
    queue.forEach((t) => pushFn(t));
    queue.length = 0;
    return () => { pushFn = null; };
  }, []);

  const dismiss = (id) => setItems((cur) => cur.filter((x) => x.id !== id));

  const icon = {
    success: <CheckCircle size={18} weight="duotone" className="text-money" />,
    error: <Warning size={18} weight="duotone" className="text-danger" />,
    info: <Info size={18} weight="duotone" className="text-brand" />,
  };

  return (
    <div className="fixed z-[95] bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[92%] max-w-sm no-print px-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-pop w-full flex items-center gap-3 rounded-2xl bg-ink text-white px-4 py-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]"
        >
          {icon[t.type] || icon.success}
          <span className="text-sm font-medium flex-1 leading-snug">{t.message}</span>
          {t.action && (
            <button
              onClick={() => { t.action.onClick(); dismiss(t.id); }}
              className="text-xs font-semibold text-brand-soft hover:text-white transition flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10"
            >
              <ArrowUUpLeft size={14} /> Undo
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="text-white/60 hover:text-white transition shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
