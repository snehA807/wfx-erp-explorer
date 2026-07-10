import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FocusRingDemo() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-role-body text-text-2">Tab through each row — the ring uses the darkened accent derivative on light, the full-brightness lime glow on inset.</p>
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Button</Button>
          <Input className="w-48" placeholder="Input" />
          <a href="#dev-tokens" className="text-role-body text-text underline underline-offset-4">
            Link
          </a>
        </div>
      </div>
      <div className="inset rounded-lg bg-inset p-6" data-surface="machine">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Button</Button>
          <Input className="w-48 bg-inset-surface text-inset-text" placeholder="Input" />
          <a href="#dev-tokens" className="text-role-body text-inset-text underline underline-offset-4">
            Link
          </a>
        </div>
      </div>
    </div>
  );
}
