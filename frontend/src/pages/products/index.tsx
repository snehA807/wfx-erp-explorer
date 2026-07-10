import { useEffect } from "react";

import { PageTitle } from "@/components/PageTitle";

export default function ProductsPage() {
  useEffect(() => {
    document.title = "Products · WFX Explorer";
  }, []);

  return <PageTitle title="Products" description="Browse the full 1,000-style catalog." />;
}
