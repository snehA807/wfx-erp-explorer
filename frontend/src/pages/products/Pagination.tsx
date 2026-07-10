import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Page-local, not promoted to components/ (component-library.md's
 * promotion rule: enters the shared file on its second usage site —
 * Products is the only consumer so far, same pattern as SQLBlock living in
 * pages/ask/ until M12g).
 */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden="true" size={16} />
        Previous
      </Button>
      <span className="text-role-small text-text-2">
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
        <ChevronRight aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}
