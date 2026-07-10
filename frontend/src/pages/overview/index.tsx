import { useEffect } from "react";

export default function OverviewPage() {
  useEffect(() => {
    document.title = "Overview · WFX Explorer";
  }, []);

  return <div>Overview (placeholder)</div>;
}
