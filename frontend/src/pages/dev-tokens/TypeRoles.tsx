const ROLES: { name: string; className: string; sample: string }[] = [
  { name: "display", className: "text-role-display", sample: "Product Explorer" },
  { name: "title", className: "text-role-title", sample: "Revenue by category" },
  { name: "body", className: "text-role-body", sample: "1,000 styles across 11 categories, live from Supabase." },
  { name: "small", className: "text-role-small", sample: "WFX-2501 · Cotton Twill · 211 GSM" },
  { name: "micro", className: "text-role-micro", sample: "Style Number" },
  { name: "stat", className: "text-role-stat", sample: "1,000" },
  { name: "stat-hero", className: "text-role-stat-hero", sample: "₹334.3 Cr" },
  { name: "mono-ui", className: "text-role-mono-ui", sample: "SELECT * FROM finished_goods LIMIT 100;" },
];

export function TypeRoles() {
  return (
    <div className="flex flex-col divide-y divide-border">
      {ROLES.map((role) => (
        <div key={role.name} className="flex items-baseline gap-6 py-3">
          <span className="text-role-micro text-text-2 w-28 shrink-0">{role.className}</span>
          <span className={`${role.className} text-text`}>{role.sample}</span>
        </div>
      ))}
    </div>
  );
}
