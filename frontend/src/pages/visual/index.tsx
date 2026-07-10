import { useEffect } from "react";

import { PageTitle } from "@/components/PageTitle";

export default function VisualSearchPage() {
  useEffect(() => {
    document.title = "Visual Search · WFX Explorer";
  }, []);

  return <PageTitle title="Visual Search" description="Searches what garments look like, not just their metadata." />;
}
