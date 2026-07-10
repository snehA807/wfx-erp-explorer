import { PageTitle } from "@/components/PageTitle";
import { StatusDot } from "@/components/StatusDot";

export function PrimitiveSpecimens() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-role-title mb-4">PageTitle</h3>
        <div className="rounded-lg border border-border bg-surface p-6">
          <PageTitle title="Product Explorer" description="1,000 styles across 11 categories." meta={<span>248 results</span>} />
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">StatusDot</h3>
        <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-surface p-6">
          <StatusDot status="live" />
          <StatusDot status="degraded" />
          <StatusDot status="down" />
        </div>
      </div>
    </div>
  );
}
