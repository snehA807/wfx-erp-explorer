import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";

const CASCADE_CARDS = [0, 1, 2, 3, 4];

export function MotionDemo() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-role-title mb-4">Card hover (motion.md §2)</h3>
        <div className="card-hover w-64 rounded border border-border bg-surface p-4">
          <p className="text-role-small text-text-2">Hover this card — lift −2px, shadow bloom, border brightens.</p>
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Product image zoom (motion.md §2)</h3>
        <div className="img-zoom-frame h-32 w-32 rounded border border-border bg-border">
          <div className="img-zoom-inner flex h-full w-full items-center justify-center text-role-small text-text-2">
            hover
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Button press (motion.md §2)</h3>
        <Button className="press">Press me</Button>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Ask composer focus glow — inset (motion.md §2)</h3>
        <div className="inset rounded-lg bg-inset p-6" data-surface="machine">
          <input
            className="focus-glow-inset w-full rounded border border-inset-border bg-inset-surface px-3 py-2 text-role-body text-inset-text outline-none"
            placeholder="Tab or click into this field"
          />
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Load cascade (motion.md §2, stat cards)</h3>
        <div className="flex gap-3">
          {CASCADE_CARDS.map((i) => (
            <div
              key={i}
              className="cascade-item h-16 w-24 rounded border border-border bg-surface"
              style={{ "--cascade-index": i } as CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
