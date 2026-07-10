const SANCTIONED_USES = [
  "Active-nav edge",
  "Selected pills",
  "Chart highlight series",
  "Focus glow on inset",
  "Seam-progress stitch",
  "Status dot",
];

/**
 * design-system.md §1 (D-F04): "Lime is a marker, never a message." Rendered
 * as plain text — the sanctioned-uses list itself never uses lime as
 * decoration, since it isn't one of the six uses it names.
 */
export function LimeUsesList() {
  return (
    <div>
      <p className="text-role-body text-text-2 mb-4">
        <span className="text-role-mono-ui text-text">--accent</span> fails contrast as text on light
        (~1.4:1). It is never body text and never a text-bearing fill except paired with{" "}
        <span className="text-role-mono-ui text-text">--accent-ink</span>. Six sanctioned uses, exhaustive:
      </p>
      <ol className="text-role-body list-decimal space-y-1 pl-6">
        {SANCTIONED_USES.map((use) => (
          <li key={use}>{use}</li>
        ))}
      </ol>
    </div>
  );
}
