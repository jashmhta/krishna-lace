export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade">
      {icon && (
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-surface-2 text-faint mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {message && <p className="text-sm text-muted mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
