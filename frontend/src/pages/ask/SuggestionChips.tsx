import { cn } from "@/lib/utils";

export interface SuggestionChipsProps {
  chips: string[];
  onSelect: (chip: string) => void;
  className?: string;
}

/**
 * SuggestionChips (component-library.md §5). Pill row on the Ask hero.
 * Hover recipe is motion.md §2's own exhaustive, pre-sanctioned entry
 * ("Chip/pill hover: border -> accent-tint, text brighten, 150ms").
 */
export function SuggestionChips({ chips, onSelect, className }: SuggestionChipsProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="rounded-full border border-inset-border bg-inset-surface px-4 py-2 text-role-small text-inset-text-2 transition-colors duration-base hover:border-accent/50 hover:text-inset-text"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
