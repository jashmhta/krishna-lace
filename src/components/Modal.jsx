import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div
        className={`relative w-full ${maxW} card shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45)] animate-rise max-h-[92dvh] flex flex-col overflow-hidden rounded-b-none sm:rounded-b-[18px]`}
      >
        <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-5 pb-4 border-b hairline">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 grid place-items-center w-9 h-9 rounded-xl text-muted hover:bg-surface-2 hover:text-ink transition focus-ring"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 sm:px-6 py-5">{children}</div>
        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t hairline bg-surface-2/60 flex items-center justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
