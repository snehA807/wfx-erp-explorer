interface Swatch {
  label: string;
  token: string;
  className: string;
}

// "-current" family — same class names on both sides; the .inset wrapper on
// the right is the *entire* theming mechanism (tokens.css Region 2).
const CURRENT_SWATCHES: Swatch[] = [
  { label: "bg", token: "--bg-current", className: "bg-bg" },
  { label: "surface", token: "--surface-current", className: "bg-surface" },
  { label: "border", token: "--border-current", className: "bg-border" },
  { label: "text", token: "--text-current", className: "bg-text" },
  { label: "text-2", token: "--text-2-current", className: "bg-text-2" },
  { label: "seam", token: "--seam-current", className: "bg-seam" },
  { label: "ring", token: "--ring-current", className: "bg-ring" },
];

const LIGHT_ONLY_SWATCHES: Swatch[] = [
  { label: "border-strong", token: "--border-strong", className: "bg-border-strong" },
  { label: "action", token: "--action", className: "bg-action" },
  { label: "action-hover", token: "--action-hover", className: "bg-action-hover" },
];

const INSET_ABSOLUTE_SWATCHES: Swatch[] = [
  { label: "inset", token: "--inset", className: "bg-inset" },
  { label: "inset-surface", token: "--inset-surface", className: "bg-inset-surface" },
  { label: "inset-border", token: "--inset-border", className: "bg-inset-border" },
  { label: "inset-text", token: "--inset-text", className: "bg-inset-text" },
  { label: "inset-text-2", token: "--inset-text-2", className: "bg-inset-text-2" },
  { label: "seam-inset", token: "--seam-inset", className: "bg-seam-inset" },
];

const ACCENT_STATUS_SWATCHES: Swatch[] = [
  { label: "accent", token: "--accent", className: "bg-accent" },
  { label: "accent-ink", token: "--accent-ink", className: "bg-accent-ink" },
  { label: "success", token: "--success", className: "bg-success" },
  { label: "success-soft", token: "--success-soft", className: "bg-success-soft" },
  { label: "warning", token: "--warning", className: "bg-warning" },
  { label: "warning-soft", token: "--warning-soft", className: "bg-warning-soft" },
  { label: "danger", token: "--danger", className: "bg-danger" },
  { label: "danger-soft", token: "--danger-soft", className: "bg-danger-soft" },
];

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {swatches.map((s) => (
        <div key={s.label} className="flex flex-col gap-2">
          <div className={`h-16 w-full rounded border border-border ${s.className}`} />
          <div className="text-role-small">
            <div className="font-medium">{s.label}</div>
            <div className="text-role-mono-ui text-text-2">{s.token}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColorSwatches() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-role-title mb-4">Light block</h3>
          <SwatchGrid swatches={[...CURRENT_SWATCHES, ...LIGHT_ONLY_SWATCHES]} />
        </div>
        <div className="inset rounded-lg border border-border bg-bg p-6" data-surface="machine">
          <h3 className="text-role-title mb-4">.inset block</h3>
          <SwatchGrid swatches={[...CURRENT_SWATCHES, ...INSET_ABSOLUTE_SWATCHES]} />
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Accent &amp; status (palette-independent)</h3>
        <SwatchGrid swatches={ACCENT_STATUS_SWATCHES} />
      </div>
    </div>
  );
}
