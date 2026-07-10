import { useEffect } from "react";

export default function SearchPage() {
  useEffect(() => {
    document.title = "Search · WFX Explorer";
  }, []);

  return <div>Search (placeholder)</div>;
}
