export interface UserTurnProps {
  text: string;
}

/**
 * UserTurn (component-library.md §5). Small right-aligned light pill — the
 * size/tone asymmetry against the full-width dark AICard below it is
 * deliberate grammar (D-F09): human input stays light and small even while
 * sitting on the Ask page's inset canvas, via the `.light` break-out scope
 * (tokens.css Region 2b, M12g).
 */
export function UserTurn({ text }: UserTurnProps) {
  return (
    <div className="flex justify-end">
      <p className="light max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-role-body text-text shadow-card">
        {text}
      </p>
    </div>
  );
}
