import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { useHealth } from "@/lib/hooks/useHealth";
import { CommandPaletteProvider } from "@/lib/hooks/useCommandPalette";
import { MACHINE_SURFACE_ATTR } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { ColdStartBanner } from "./ColdStartBanner";
import { CommandPalette } from "./CommandPalette";
import { MobileTabs } from "./MobileTabs";
import { Sidebar } from "./Sidebar";

const COLD_START_KEY = "wfx.coldstart.shown";

/**
 * Composition root (component-library.md §3, m12c-contract.md §1). Owns the
 * responsive sidebar/rail/tabs switch, the main column, the route outlet,
 * the shadcn ToastViewport mount, the ColdStartBanner slot, the command
 * palette (M12h — `CommandPalette` owns its own ⌘K listener and behavior;
 * `CommandPaletteProvider` wraps the whole shell since the palette's open
 * state is needed by both this component and every page's title-block
 * trigger button, a second unrelated tree — the exact m12b-contract.md §8
 * threshold that earns a context provider), and the app's single
 * useHealth() call. Health state itself still flows down to Sidebar
 * (status) and ColdStartBanner (isSlow) as plain props, not context — only
 * the palette's state crosses the shell/page boundary.
 */
export function AppShell() {
  const { status, health, isSlow } = useHealth();
  // Light<->inset route transition (motion.md §3.2): Ask ("/") is the one
  // whole-page machine surface (D-F02). <main> is the only DOM node that
  // persists across route navigation within this layout route, so it's the
  // only place a real crossfade (not an abrupt mount/unmount swap) can live
  // — logged as an M12g deviation from implementation-plan.md's literal
  // "Files modified: —" for this milestone, pre-authorized by
  // m12c-contract.md §10 ("ships with M12g's first real inset surface").
  const isAsk = useLocation().pathname === "/";

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
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
        <Sidebar status={status} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <ColdStartBanner visible={showBanner} onDismiss={() => setDismissed(true)} />
          <main
            className={cn(
              "mx-auto w-full min-w-0 max-w-content flex-1 px-4 pb-20 pt-6 transition-colors duration-base md:px-6 md:pb-6",
              isAsk && "inset",
            )}
            {...(isAsk ? MACHINE_SURFACE_ATTR : {})}
          >
            <Outlet />
          </main>
        </div>
        <MobileTabs />
        <Toaster />
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
