import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { useHealth } from "@/lib/hooks/useHealth";

import { ColdStartBanner } from "./ColdStartBanner";
import { MobileTabs } from "./MobileTabs";
import { Sidebar } from "./Sidebar";

const COLD_START_KEY = "wfx.coldstart.shown";

/**
 * Composition root (component-library.md §3, m12c-contract.md §1). Owns the
 * responsive sidebar/rail/tabs switch, the main column, the route outlet,
 * the shadcn ToastViewport mount, the ColdStartBanner slot, the command
 * palette mount point (stub only — no component, no ⌘K listener; both are
 * M12h), and the app's single useHealth() call. Health state flows down to
 * Sidebar (status) and ColdStartBanner (isSlow) as props — no context
 * provider, same reasoning as m12b-contract.md §8: a provider earns
 * existence when two unrelated trees need the data, and nothing outside the
 * shell does.
 */
export function AppShell() {
  const { status, health, isSlow } = useHealth();

  // Session-once gate (§6): a ref (not state) for the sessionStorage read so
  // it's evaluated exactly once, before the first isSlow transition can race it.
  const alreadyShownRef = useRef(
    typeof window !== "undefined" && sessionStorage.getItem(COLD_START_KEY) === "1",
  );
  const [triggered, setTriggered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isSlow && !alreadyShownRef.current && !triggered) {
      sessionStorage.setItem(COLD_START_KEY, "1");
      alreadyShownRef.current = true;
      setTriggered(true);
    }
  }, [isSlow, triggered]);

  // health is only ever set on a *successful* getHealth() call (useHealth's
  // catch branch never calls setHealth), so `health === null` doubles as
  // "the pending check hasn't resolved successfully yet" — the banner hides
  // automatically the moment it does, per §6.
  const showBanner = triggered && health === null && !dismissed;

  return (
    <div className="flex min-h-screen">
      <Sidebar status={status} />
      <div className="flex min-h-screen flex-1 flex-col">
        <ColdStartBanner visible={showBanner} onDismiss={() => setDismissed(true)} />
        <main className="mx-auto w-full max-w-content flex-1 px-4 pb-20 pt-6 md:px-6 md:pb-6">
          <Outlet />
          {/* Command palette mount point (M12h) — marked stub only: no
              component is rendered here and no ⌘K listener is attached. */}
        </main>
      </div>
      <MobileTabs />
      <Toaster />
    </div>
  );
}
