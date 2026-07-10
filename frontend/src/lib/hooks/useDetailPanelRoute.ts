import { useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface UseDetailPanelRouteResult {
  styleNumber: string | null;
  openDetail: (styleNumber: string) => void;
  closeDetail: () => void;
}

/**
 * `?style`-driven DetailPanel open/close (navigation.md §2: "?style" opens
 * the panel on any grid page; Back closes it), shared by Products/Search/
 * Visual (extracted from Products' M12e implementation once a second
 * consumer needed the identical logic — decisions.md D-F46).
 *
 * Opening **pushes** a history entry (`setSearchParams` defaults to
 * `replace: false`); every close path (X button, Esc, overlay click, a
 * "More like this" jump) calls `closeDetail()`, which pops that entry via
 * `navigate(-1)` when this hook did the pushing (tracked in a ref, not
 * state, so it can't race the first render) and falls back to stripping
 * `?style` via `replace: true` only for a cold deep link with no prior
 * in-app entry to pop. This is what makes "back button closes panel and
 * restores scroll" hold for both the browser Back button and the panel's
 * own close controls — a `replace`d entry never had a pre-open scroll
 * position recorded against it.
 */
export function useDetailPanelRoute(): UseDetailPanelRouteResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const openedRef = useRef(false);

  const openDetail = useCallback(
    (styleNumber: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("style", styleNumber);
      openedRef.current = true;
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const closeDetail = useCallback(() => {
    if (openedRef.current) {
      navigate(-1);
    } else {
      const next = new URLSearchParams(searchParams);
      next.delete("style");
      setSearchParams(next, { replace: true });
    }
    openedRef.current = false;
  }, [searchParams, setSearchParams, navigate]);

  return { styleNumber: searchParams.get("style"), openDetail, closeDetail };
}
