export function StatusDot({ color = "bg-faint" }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

export function Avatar({ name, size = 36 }) {
  const init = (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      className="grid place-items-center rounded-full bg-surface-2 text-ink-soft font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {init}
    </div>
  );
}
