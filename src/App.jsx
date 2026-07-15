import { useState, useMemo, useEffect } from "react";
import { useStore } from "./lib/useStore.js";
import { syncFromAPI } from "./lib/store.js";
import { Sidebar, MobileNav } from "./components/Sidebar.jsx";
import { ToastHost } from "./components/Toast.jsx";
import { Confirm } from "./components/Confirm.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Inventory from "./pages/Inventory.jsx";
import Clients from "./pages/Clients.jsx";
import Invoices from "./pages/Invoices.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  const store = useStore();
  const [route, setRoute] = useState("dashboard");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    syncFromAPI();
  }, []);

  // Keyboard shortcuts: g+h (home), g+s (stock), g+i (invoices), g+c (clients)
  useEffect(() => {
    let lastKey = "";
    let lastTime = 0;
    const handler = (e) => {
      if (e.target.matches("input, textarea, select")) return;
      const now = Date.now();
      if (now - lastTime > 800) lastKey = "";
      lastTime = now;
      if (lastKey === "g") {
        if (e.key === "h") { setRoute("dashboard"); lastKey = ""; }
        else if (e.key === "s") { setRoute("inventory"); lastKey = ""; }
        else if (e.key === "i") { setRoute("invoices"); lastKey = ""; }
        else if (e.key === "c") { setRoute("clients"); lastKey = ""; }
        else lastKey = e.key;
      } else if (e.key === "g") {
        lastKey = "g";
      } else if (e.key === "n" && route === "invoices") {
        // handled within page
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [route]);

  const alertCount = useMemo(
    () => store.products.filter((p) => Number(p.stock) <= Number(p.lowStock || 0)).length,
    [store.products]
  );

  const navigate = (key) => setRoute(key);

  useEffect(() => {
    const handler = (e) => setConfirm(e.detail);
    window.addEventListener("app-confirm", handler);
    return () => window.removeEventListener("app-confirm", handler);
  }, []);

  const Page = {
    dashboard: <Dashboard navigate={navigate} />,
    inventory: <Inventory navigate={navigate} />,
    clients: <Clients navigate={navigate} />,
    invoices: <Invoices navigate={navigate} />,
    settings: <Settings />,
  }[route];

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="flex">
        <Sidebar
          active={route}
          onNavigate={navigate}
          business={store.settings.business}
          alertCount={alertCount}
        />
        <main className="flex-1 min-w-0 pb-28 lg:pb-0">
          <div className="max-w-[1180px] mx-auto px-3 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8">
            {Page}
          </div>
        </main>
      </div>
      <MobileNav active={route} onNavigate={navigate} alertCount={alertCount} />
      <ToastHost />
      <Confirm
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  );
}
