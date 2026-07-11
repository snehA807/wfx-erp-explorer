import { MessageCircleQuestion, Search as SearchIcon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";

import { ProductCard } from "@/components/ProductCard";
import { Seam } from "@/components/Seam";
import { DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { VisuallyHidden } from "@/components/VisuallyHidden";
import { searchProducts, type SearchHit } from "@/lib/api";
import { addRecent, getRecents, type RecentEntry } from "@/lib/recents";
import { useCommandPalette } from "@/lib/hooks/useCommandPalette";
import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./Sidebar";

const LIVE_RESULTS_LIMIT = 5;
const DEBOUNCE_MS = 250;

export interface CommandPaletteTriggerProps {
  className?: string;
}

/**
 * Slim ghost trigger button (navigation.md §5: "Search or ask… ⌘K"). Lives
 * in each page's `PageTitle` `actions` slot; Ask (no PageTitle, D-F01) mounts
 * it directly. Token classes resolve through the "-current" family, so the
 * same markup reads correctly on both light PageTitle blocks and Ask's
 * `.inset` surface with no variant prop needed.
 */
export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { openPalette } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={openPalette}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-role-small text-text-2 transition-colors duration-fast hover:border-border-strong hover:text-text",
        className,
      )}
    >
      <SearchIcon aria-hidden="true" size={14} />
      <span>Search or ask…</span>
      <kbd className="rounded-sm border border-border px-1 text-role-micro normal-case text-text-2">⌘K</kbd>
    </button>
  );
}

/**
 * CommandPalette (component-library.md §3, navigation.md §5). Renders on
 * inset tokens regardless of the ambient page (D-F08: a machine surface),
 * radius-lg, floating shadow, top Seam (sanctioned location 1: the
 * light↔inset boundary). Owns the global ⌘K/Ctrl+K listener, its own
 * debounced live product query, and recents read/write — global mount,
 * no props (component-library.md §3).
 */
export function CommandPalette() {
  const { isOpen, setOpen, closePalette } = useCommandPalette();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [liveResults, setLiveResults] = useState<SearchHit[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  // Keyboard: Cmd+K (mac) / Ctrl+K (other) toggles, anywhere in the app
  // (navigation.md §5). Attached once here rather than in AppShell —
  // CommandPalette is the one component documented to own "behavior per
  // navigation.md §5" (component-library.md §3).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!isOpen);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  // Recents (sessionStorage, cap 5, D-F08) — re-read on every open so a
  // recent added in another tab/page since the last open is reflected.
  useEffect(() => {
    if (isOpen) setRecents(getRecents());
  }, [isOpen]);

  // Reset to a clean slate on close, so reopening starts fresh (Raycast/⌘K
  // convention) rather than resuming a stale in-progress query.
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setLiveResults([]);
    }
  }, [isOpen]);

  // Live product results (navigation.md §5 group 2): up to 5, debounced
  // 250ms. navigation.md's literal `GET /products?search=` doesn't exist on
  // the frozen backend (`ProductListParams` has no `search` field,
  // `extra="forbid"` — the exact gap M12e already found and logged as
  // D-F40 for the Products toolbar). `POST /search/products` is the real
  // backend capability closest to "live product results for typed text";
  // reused here rather than inventing new backend surface, same resolution
  // D-F40 already applied. Logged as its own decision (D-F57).
  const trimmedQuery = query.trim();
  useEffect(() => {
    if (!trimmedQuery) {
      setLiveResults([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      searchProducts({ query: trimmedQuery, limit: LIVE_RESULTS_LIMIT })
        .then((hits) => {
          if (!cancelled) setLiveResults(hits);
        })
        .catch(() => {
          if (!cancelled) setLiveResults([]);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [trimmedQuery]);

  function go(to: string) {
    closePalette();
    navigate(to);
  }

  function runAsk(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    closePalette();
    // AskPage's own mount effect reads this and calls its existing
    // submitQuestion() (which itself calls addRecent) — not duplicated here.
    navigate("/", { state: { autoAsk: trimmed } });
  }

  function runSearch(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    addRecent({ type: "search", text: trimmed });
    closePalette();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function openProduct(styleNumber: string) {
    closePalette();
    navigate(`/products?style=${encodeURIComponent(styleNumber)}`);
  }

  function runRecent(entry: RecentEntry) {
    if (entry.type === "ask") {
      runAsk(entry.text);
    } else {
      runSearch(entry.text);
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="z-palette" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            // Radix would otherwise focus the Content root; CommandInput
            // should get focus instead (it has its own autoFocus below).
            event.preventDefault();
          }}
          className={cn(
            "inset fixed left-1/2 top-1/2 z-palette w-full max-w-lg overflow-hidden rounded-lg border border-inset-border bg-inset text-inset-text shadow-float",
            "data-[state=open]:animate-palette-in",
          )}
          data-surface="machine"
        >
          <VisuallyHidden>
            <DialogTitle>Command palette</DialogTitle>
          </VisuallyHidden>
          <Seam variant="inset" />
          <Command shouldFilter={false} className="bg-inset text-inset-text">
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search or ask anything…"
              className="text-inset-text placeholder:text-inset-text-2"
            />
            <CommandList className="max-h-96">
              <CommandEmpty className="py-6 text-center text-role-small text-inset-text-2">
                No matches.
              </CommandEmpty>

              {trimmedQuery ? (
                <CommandGroup heading="Ask">
                  <CommandItem value="ask-verb" onSelect={() => runAsk(trimmedQuery)}>
                    <MessageCircleQuestion aria-hidden="true" size={16} />
                    <span className="truncate">
                      Ask: <span className="font-medium">&ldquo;{trimmedQuery}&rdquo;</span>
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}

              {trimmedQuery ? (
                <CommandGroup heading="Search products">
                  <CommandItem value="search-verb" onSelect={() => runSearch(trimmedQuery)}>
                    <SearchIcon aria-hidden="true" size={16} />
                    <span className="truncate">
                      Search products: <span className="font-medium">&ldquo;{trimmedQuery}&rdquo;</span>
                    </span>
                  </CommandItem>
                  {liveResults.map((hit) => (
                    <CommandItem
                      key={hit.style_number}
                      value={`product-${hit.style_number}`}
                      onSelect={() => openProduct(hit.style_number)}
                    >
                      <ProductCard product={hit} matchScore={hit.score} variant="row" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              <CommandGroup heading="Go to">
                {NAV_ITEMS.map((item) => (
                  <CommandItem key={item.to} value={`go-${item.to}`} onSelect={() => go(item.to)}>
                    <item.icon aria-hidden="true" size={16} />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              {recents.length > 0 ? (
                <CommandGroup heading="Recent">
                  {recents.map((entry) => (
                    <CommandItem
                      key={`${entry.type}-${entry.text}-${entry.timestamp}`}
                      value={`recent-${entry.type}-${entry.timestamp}`}
                      onSelect={() => runRecent(entry)}
                    >
                      {entry.type === "ask" ? (
                        <Sparkles aria-hidden="true" size={16} />
                      ) : (
                        <SearchIcon aria-hidden="true" size={16} />
                      )}
                      <span className="truncate">{entry.text}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
