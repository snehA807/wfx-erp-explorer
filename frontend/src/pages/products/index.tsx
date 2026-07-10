import { useEffect } from "react";

export default function ProductsPage() {
  useEffect(() => {
    document.title = "Products · WFX Explorer";
  }, []);

  return <div>Products (placeholder)</div>;
}
