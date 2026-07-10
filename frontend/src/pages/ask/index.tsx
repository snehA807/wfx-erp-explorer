import { useEffect } from "react";

export default function AskPage() {
  useEffect(() => {
    document.title = "Ask · WFX Explorer";
  }, []);

  return <div>Ask (placeholder)</div>;
}
