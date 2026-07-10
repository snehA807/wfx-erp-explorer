export interface ColdStartBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Cold-start banner (D-F12, m12c-contract.md §6). Stateless — session-once
 * logic lives in AppShell. Neutral, not warning-tinted (the warning-on-
 * warning-soft pairing is the D-F26 contrast conflict, quarantined until
 * M12d). No entrance animation: it isn't in motion.md §2's inventory, so a
 * plain conditional render (instant swap) is correct, not a missing feature.
 */
export function ColdStartBanner({ visible, onDismiss }: ColdStartBannerProps) {
  if (!visible) return null;

  return (
    <div role="status" className="border-b border-border bg-surface px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4">
        <p className="text-role-small text-text">Waking the server (free tier) — a few seconds.</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-role-small font-medium text-text-2 transition-colors duration-fast hover:text-text"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
