import { LayoutDashboard, type LucideIcon, ScanSearch, Search, ShoppingBag, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// navigation.md §3/§6: same five routes, same order as Sidebar.
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Ask", icon: Sparkles, end: true },
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/search", label: "Search", icon: Search },
  { to: "/visual", label: "Visual Search", icon: ScanSearch },
];

/**
 * Bottom tab bar, <768px only (navigation.md §6, m12c-contract.md §4). No
 * props — reads the route itself. DetailPanel-as-sheet and the filter sheet
 * are M12e/M12f concerns; this bar is this milestone's only mobile deliverable.
 */
export function MobileTabs() {
  return (
    <nav
      aria-label="Primary"
      className="pb-safe-bottom fixed inset-x-0 bottom-0 z-shell flex border-t border-border bg-surface md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-1 px-2 py-2",
                isActive ? "text-text" : "text-text-2",
              )
            }
          >
            {({ isActive }) => {
              // Sidebar's active treatment (§3), rotated to this geometry
              // (§4): Ask carries the same faint resting edge at all times,
              // full accent only when it's the active route.
              const showEdge = isActive || item.to === "/";
              return (
                <>
                  {showEdge ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent transition-opacity duration-fast",
                        isActive ? "opacity-100" : "opacity-30",
                      )}
                    />
                  ) : null}
                  <Icon aria-hidden="true" size={18} />
                  <span className="text-role-tab">{item.label}</span>
                </>
              );
            }}
          </NavLink>
        );
      })}
    </nav>
  );
}
