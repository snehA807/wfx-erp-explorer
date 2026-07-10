import { useEffect } from "react";

import { PageTitle } from "@/components/PageTitle";

export default function OverviewPage() {
  useEffect(() => {
    document.title = "Overview · WFX Explorer";
  }, []);

  return <PageTitle title="Overview" description="Revenue, orders, and category breakdown at a glance." />;
}
