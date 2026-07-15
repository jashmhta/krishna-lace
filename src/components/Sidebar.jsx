import {
  House, Stack, Users, Receipt, Gear, Scissors,
} from "@phosphor-icons/react";

const NAV = [
  { key: "dashboard", label: "Home", icon: House },
  { key: "inventory", label: "Stock", icon: Stack },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "clients", label: "Clients", icon: Users },
  { key: "settings", label: "Settings", icon: Gear },
];

export function Sidebar({ active, onNavigate, business, alertCount }) {
  return (
    <aside className="hidden lg:flex flex-col w-[248px] shrink-0 border-r hairline bg-surface/70 backdrop-blur-sm h-dvh sticky top-0 no-print">
      <div className="flex items-center gap-3 px-5 h-[68px] border-b hairline">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.15)] ring-1 ring-white/20">
          <img src="/logo.svg" alt="KLH" className="w-full h-full" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink leading-tight truncate">{business}</p>
          <p className="text-[11px] text-faint leading-tight">Stock &amp; Billing</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                isActive ? "bg-ink text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-ink-soft hover:bg-surface-2"
              }`}
            >
              <Icon size={19} weight={isActive ? "fill" : "regular"} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === "inventory" && alertCount > 0 && (
                <span className={`text-[11px] font-semibold tnum px-1.5 py-0.5 rounded-md ${
                  isActive ? "bg-white/20 text-white" : "bg-alert-soft text-alert"
                }`}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t hairline">
        <p className="text-[11px] text-faint leading-relaxed">
          Data syncs to the cloud &amp; this device. Export regularly as a backup.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({ active, onNavigate, alertCount }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-md border-t hairline no-print pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1 sm:px-2 max-w-md mx-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="relative flex-1 flex flex-col items-center gap-1 py-2 transition min-h-[52px]"
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={22} weight={isActive ? "fill" : "regular"} className={isActive ? "text-ink" : "text-faint"} />
                {item.key === "inventory" && alertCount > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-bold tnum bg-alert text-white px-1 py-px rounded-full leading-none">{alertCount}</span>
                )}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? "text-ink" : "text-faint"}`}>{item.label}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
