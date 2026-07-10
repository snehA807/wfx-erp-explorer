import { useEffect } from "react";

export default function VisualSearchPage() {
  useEffect(() => {
    document.title = "Visual Search · WFX Explorer";
  }, []);

  return <div>Visual Search (placeholder)</div>;
}
