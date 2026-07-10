import {
  ExternalLink,
  LayoutDashboard,
  type LucideIcon,
  ScanSearch,
  Search,
  Shirt,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { StatusDot, type StatusDotStatus } from "@/components/StatusDot";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Repo URL sourced from the origin remote (m12c-contract.md §3 footer link).
const REPO_URL = "https://github.com/snehA807/wfx-erp-explorer";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only Ask ("/") needs exact matching — the other four routes are distinct, non-nested paths. */
  end?: boolean;
}

// navigation.md §3/§4: the five routes in frequency order.
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Ask", icon: Sparkles, end: true },
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/search", label: "Search", icon: Search },
  { to: "/visual", label: "Visual Search", icon: ScanSearch },
];

export interface SidebarProps {
  status: StatusDotStatus;
}

/**
 * Desktop sidebar (>1280) and tablet icon rail (768–1280) — one component,
 * two responsive presentations (m12c-contract.md §1): both share structure,
 * active-state logic, and footer; only width/label-visibility differ, driven
 * entirely by Tailwind breakpoint classes, not JS. Reads the route itself
 * (NavLink); receives `status` for the footer.
 */
export function Sidebar({ status }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label="Primary"
        className="sticky top-0 z-shell hidden h-screen shrink-0 flex-col border-r border-border bg-surface md:flex md:w-rail xl:w-sidebar"
      >
        <div className="flex items-center gap-3 px-3 py-4 xl:px-5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-action text-surface">
            <Shirt aria-hidden="true" size={18} />
          </span>
          <span className="hidden truncate text-role-title text-text xl:inline">WFX Explorer</span>
        </div>

        <div className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>

        <div className="border-t border-border px-3 py-4 xl:px-5">
          {/* Rail (768–1280): compact StatusDot, full label surfaces via tooltip. */}
          <div className="hidden justify-center md:flex xl:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="rounded-sm">
                  <StatusDot status={status} compact />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">1,000 styles · {STATUS_LABEL[status]}</TooltipContent>
            </Tooltip>
          </div>

          {/* Full sidebar (>1280): "1,000 styles" (micro role) + StatusDot's own label
              compose into navigation.md's "1,000 styles · Live" without duplicating "Live". */}
          <div className="hidden items-center gap-2 xl:flex">
            <span className="text-role-micro text-text-2">1,000 styles</span>
            <StatusDot status={status} />
          </div>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="mt-3 flex items-center justify-center gap-2 text-role-small text-text-2 transition-colors duration-fast hover:text-text xl:justify-start"
          >
            <ExternalLink aria-hidden="true" size={16} />
            <span className="hidden xl:inline">GitHub</span>
          </a>
        </div>
      </nav>
    </TooltipProvider>
  );
}

const STATUS_LABEL: Record<StatusDotStatus, string> = {
  live: "Live",
  degraded: "Degraded",
  down: "Offline",
};

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={item.to}
          end={item.end}
          aria-label={item.label}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-fast xl:justify-start",
              "justify-center",
              isActive ? "bg-accent/10 text-text" : "text-text-2 hover:bg-border/40 hover:text-text",
            )
          }
        >
          {({ isActive }) => {
            const showEdge = isActive || item.to === "/";
            return (
              <>
                {showEdge ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent transition-opacity duration-fast",
                      isActive ? "opacity-100" : "opacity-30",
                    )}
                  />
                ) : null}
                <span className="shrink-0 transition-transform duration-fast ease-out-app group-hover:translate-x-px">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <span className="hidden truncate text-role-small font-medium xl:inline">{item.label}</span>
              </>
            );
          }}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="xl:hidden">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
