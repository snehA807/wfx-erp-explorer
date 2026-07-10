import { useEffect } from "react";

import { PageTitle } from "@/components/PageTitle";

export default function SearchPage() {
  useEffect(() => {
    document.title = "Search · WFX Explorer";
  }, []);

  return <PageTitle title="Search" description="Find products by describing what you're looking for." />;
}
