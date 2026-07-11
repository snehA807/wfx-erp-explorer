import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface CommandPaletteContextValue {
  isOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/**
 * Shared open/close state for the command palette (navigation.md §5). A
 * provider earns existence here per m12b-contract.md §8's own threshold
 * ("two unrelated trees need the data"): AppShell owns the mounted
 * CommandPalette + the global ⌘K listener, while every page's title-block
 * trigger button (a descendant of AppShell's Outlet, a separate tree) needs
 * to open the same instance. Not a global state library (D-F05 forbids
 * those) — one boolean via React's own Context.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openPalette, closePalette, setOpen: setIsOpen }),
    [isOpen, openPalette, closePalette],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  return ctx;
}
