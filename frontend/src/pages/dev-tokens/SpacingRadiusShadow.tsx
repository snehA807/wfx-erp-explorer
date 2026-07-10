const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 8, 12] as const;
const RADII: { name: string; className: string }[] = [
  { name: "sm (6px)", className: "rounded-sm" },
  { name: "DEFAULT (8px)", className: "rounded" },
  { name: "lg (12px)", className: "rounded-lg" },
  { name: "full (999px)", className: "rounded-full" },
];
const SHADOWS: { name: string; className: string }[] = [
  { name: "shadow-card", className: "shadow-card" },
  { name: "shadow-card-hover", className: "shadow-card-hover" },
  { name: "shadow-float", className: "shadow-float" },
];

export function SpacingRadiusShadow() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-role-title mb-4">Spacing (4px scale)</h3>
        <div className="flex flex-col gap-2">
          {SPACE_STEPS.map((step) => (
            <div key={step} className="flex items-center gap-3">
              <span className="text-role-mono-ui text-text-2 w-16">space-{step}</span>
              <div className={`h-4 bg-accent`} style={{ width: `var(--space-${step})` }} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Radius</h3>
        <div className="flex flex-wrap gap-6">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-16 border border-border bg-surface ${r.className}`} />
              <span className="text-role-small text-text-2">{r.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Elevation</h3>
        <div className="flex flex-wrap gap-8 py-4">
          {SHADOWS.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-3">
              <div className={`h-16 w-32 rounded bg-surface ${s.className}`} />
              <span className="text-role-small text-text-2">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
