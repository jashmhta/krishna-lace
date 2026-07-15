export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-faint mt-1.5">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1.5">{error}</span>}
    </label>
  );
}
