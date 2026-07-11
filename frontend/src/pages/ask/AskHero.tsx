import { Seam } from "@/components/Seam";

import { AskComposer } from "./AskComposer";
import { SuggestionChips } from "./SuggestionChips";

export interface AskHeroProps {
  onSubmit: (question: string) => void;
  chips: string[];
}

/**
 * AskHero (component-library.md §5). Full-inset centered composer +
 * suggestion chips (D-F01: the home screen's thesis statement, not stat
 * cards). Ask has no PageTitle block (D-F01 explicitly replaces it); this
 * heading is the page's real `<h1>`, with a Seam beneath it — sanctioned
 * location 2 ("under every editorial page title", design-system.md §12) —
 * standing in for PageTitle's own built-in Seam since PageTitle's
 * title+meta/actions layout doesn't fit this centered composition.
 */
export function AskHero({ onSubmit, chips }: AskHeroProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="w-full max-w-thread">
        <h1 className="text-role-display text-inset-text">Ask the catalog anything</h1>
        <p className="mt-3 text-role-body text-inset-text-2">
          Plain-English questions become SQL, results, and a written answer — no query language required.
        </p>
        <Seam variant="inset" className="mt-6" />
      </div>
      <AskComposer onSubmit={onSubmit} autoFocus />
      <SuggestionChips chips={chips} onSelect={onSubmit} />
    </div>
  );
}
