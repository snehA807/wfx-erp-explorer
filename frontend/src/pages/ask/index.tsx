import { useEffect } from "react";

import { PageTitle } from "@/components/PageTitle";

export default function AskPage() {
  useEffect(() => {
    document.title = "Ask · WFX Explorer";
  }, []);

  // M12g replaces this wholesale with the dark hero (m12c-contract.md §7) —
  // a PageTitle block like the other four pages is this milestone's stand-in.
  return <PageTitle title="Ask" description="Ask a question about the catalog in plain English." />;
}
