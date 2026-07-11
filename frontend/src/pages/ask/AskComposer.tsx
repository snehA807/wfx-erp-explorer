import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface AskComposerProps {
  onSubmit: (question: string) => void;
  /** While streaming (component-library.md §5). Implemented as `readOnly`,
   * not the native `disabled` attribute — J1's "follow-up composer stays
   * focused" needs the textarea to keep DOM focus/visible ring through a
   * turn, not lose it the moment a stream starts. */
  disabled?: boolean;
  autoFocus?: boolean;
  /** Bottom-pinned thread presentation vs. the hero's inline centered one. */
  pinned?: boolean;
  className?: string;
}

const MAX_LINES = 4;
const LINE_HEIGHT_PX = 21; // body role: 14px * 1.5 line-height
const VERTICAL_PADDING_PX = 16;

/**
 * AskComposer (component-library.md §5). Auto-grow textarea (max 4 lines),
 * Enter submits / Shift+Enter newline / Esc clears (design-system.md §10,
 * implementation-plan.md M12g acceptance). Lime focus glow on inset
 * (motion.md §2, `.focus-glow-inset` from tokens.css).
 */
export function AskComposer({ onSubmit, disabled, autoFocus, pinned, className }: AskComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT_PX * MAX_LINES + VERTICAL_PADDING_PX;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      setValue("");
    }
  }

  return (
    <div className={cn("w-full max-w-thread", pinned && "sticky bottom-4 z-shell", className)}>
      <div className="focus-glow-inset flex items-end gap-2 rounded-lg border border-inset-border bg-inset-surface p-2 shadow-float">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={disabled}
          autoFocus={autoFocus}
          rows={1}
          placeholder="Ask about products, orders, suppliers, revenue…"
          aria-label="Ask a question about the catalog"
          className="min-h-0 flex-1 resize-none border-0 bg-transparent text-role-body text-inset-text placeholder:text-inset-text-2 focus-visible:ring-0"
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Submit question"
        >
          <ArrowUp size={18} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
