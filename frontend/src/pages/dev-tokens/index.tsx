import { useEffect } from "react";

import { BadgeMatrix } from "./BadgeMatrix";
import { ColorSwatches } from "./ColorSwatches";
import { ContrastTable } from "./ContrastTable";
import { FocusRingDemo } from "./FocusRingDemo";
import { LimeUsesList } from "./LimeUsesList";
import { MotionDemo } from "./MotionDemo";
import { PrimitiveSpecimens } from "./PrimitiveSpecimens";
import { SeamDemo } from "./SeamDemo";
import { SpacingRadiusShadow } from "./SpacingRadiusShadow";
import { TypeRoles } from "./TypeRoles";

const SECTIONS: { id: string; title: string; content: React.ReactNode }[] = [
  { id: "colors", title: "1. Color tokens", content: <ColorSwatches /> },
  { id: "type", title: "2. Type roles", content: <TypeRoles /> },
  { id: "spacing", title: "3. Spacing / radius / shadow", content: <SpacingRadiusShadow /> },
  { id: "badges", title: "4. Badge status matrix", content: <BadgeMatrix /> },
  { id: "seam", title: "5. Seam + SeamProgress", content: <SeamDemo /> },
  { id: "motion", title: "6. Motion recipes", content: <MotionDemo /> },
  { id: "focus", title: "7. Focus ring", content: <FocusRingDemo /> },
  { id: "contrast", title: "8. Contrast ratios", content: <ContrastTable /> },
  { id: "lime", title: "9. Lime sanctioned uses", content: <LimeUsesList /> },
  { id: "primitives", title: "10. PageTitle / StatusDot", content: <PrimitiveSpecimens /> },
];

/**
 * /dev-tokens — throwaway QA route (m12b-contract.md §12), deleted in M12i.
 * Not linked from navigation; exists purely to eyeball every design-system.md
 * value and verify the acceptance criteria in m12b-contract.md §13.
 */
export default function DevTokensPage() {
  useEffect(() => {
    document.title = "Dev Tokens · WFX Explorer";
  }, []);

  return (
    <div className="mx-auto max-w-content px-6 py-12">
      <h1 className="text-role-display text-text mb-2">Design Tokens QA</h1>
      <p className="text-role-body text-text-2 mb-12">
        Throwaway verification route for M12b. Deleted at M12i. Not linked from app navigation.
      </p>
      <div className="flex flex-col gap-16">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-role-title text-text mb-6 border-b border-border pb-3">{section.title}</h2>
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
}
