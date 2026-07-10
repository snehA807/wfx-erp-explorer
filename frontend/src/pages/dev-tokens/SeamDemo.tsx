import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Seam } from "@/components/Seam";
import { SeamProgress, type SeamProgressState } from "@/components/SeamProgress";

const STEPS: { label: string; state: SeamProgressState; stageIndex?: number; errorKind?: "warning" | "danger" }[] = [
  { label: "Idle", state: "idle" },
  { label: "Stitching ¼", state: "stitching", stageIndex: 1 },
  { label: "Stitching ½", state: "stitching", stageIndex: 2 },
  { label: "Stitching ¾", state: "stitching", stageIndex: 3 },
  { label: "Complete", state: "complete" },
  { label: "Error (SQL_BLOCKED)", state: "error", stageIndex: 2, errorKind: "warning" },
  { label: "Error (failure)", state: "error", stageIndex: 3, errorKind: "danger" },
];

export function SeamDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-role-title mb-4">Seam (static)</h3>
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-role-small text-text-2">variant=&quot;light&quot;</span>
            <Seam variant="light" className="mt-2" />
          </div>
          <div className="inset rounded-lg bg-bg p-4" data-surface="machine">
            <span className="text-role-small text-inset-text-2">variant=&quot;inset&quot;</span>
            <Seam variant="inset" className="mt-2" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-role-title mb-4">SeamProgress (kinetic) — state stepper</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <Button key={s.label} size="sm" variant={i === stepIndex ? "default" : "outline"} onClick={() => setStepIndex(i)}>
              {s.label}
            </Button>
          ))}
        </div>
        <div className="inset rounded-lg bg-inset-surface p-6" data-surface="machine">
          <SeamProgress state={step.state} stageIndex={step.stageIndex} errorKind={step.errorKind} />
          <p className="text-role-small text-inset-text-2 mt-3">
            state=&quot;{step.state}&quot;{step.stageIndex !== undefined ? ` stageIndex=${step.stageIndex}` : ""}
            {step.errorKind ? ` errorKind=${step.errorKind}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
