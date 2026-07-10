import type { ReactNode } from "react";

import { Seam } from "./Seam";

export interface PageTitleProps {
  title: string;
  description?: string;
  /** e.g. a result count */
  meta?: ReactNode;
  /** e.g. the command palette trigger */
  actions?: ReactNode;
}

/**
 * Editorial title block (component-library.md §2). Display type + muted
 * description, a Seam underneath (sanctioned location 2 of the Seam
 * system's four-location budget), and 40px bottom air — design-system.md
 * §3's one deliberate exception to the 4px scale. Used on every page.
 */
export function PageTitle({ title, description, meta, actions }: PageTitleProps) {
  return (
    <div className="mb-title-bottom">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-role-display text-text">{title}</h1>
          {description ? <p className="text-role-body text-text-2 mt-2">{description}</p> : null}
        </div>
        {meta || actions ? (
          <div className="flex items-center gap-3 text-role-small text-text-2">
            {meta}
            {actions}
          </div>
        ) : null}
      </div>
      <Seam className="mt-4" />
    </div>
  );
}
