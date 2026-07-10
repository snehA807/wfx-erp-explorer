import { useEffect, useState } from "react";

import { CategoryPlaceholder } from "@/components/CategoryPlaceholder";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { Seam } from "@/components/Seam";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { VisuallyHidden } from "@/components/VisuallyHidden";
import {
  ApiError,
  getProductDetail,
  getSimilarProducts,
  type ProductDetailData,
  type ProductSummary,
} from "@/lib/api";

export interface DetailPanelProps {
  /** null = closed. Driven by the `?style` URL param (navigation.md §2) so
   * every consumer page shares one component instead of three copies. */
  styleNumber: string | null;
  onClose: () => void;
  onOpenProduct: (styleNumber: string) => void;
}

/**
 * DetailPanel (component-library.md §4). Right Sheet, 480px. Fetches
 * `GET /products/{id}` itself — the documented single-use fetch exception,
 * since it's mounted once per page and opened/closed via a prop rather than
 * a route. Anatomy: image -> identity -> price/cost -> Seam -> spec grid ->
 * Seam -> tech pack (if present) -> Seam -> supplier -> "More like this"
 * strip (via /products/{id}/similar; honest empty state if none — M9's
 * embeddings backfill means this is the exception, not the rule).
 */
export function DetailPanel({ styleNumber, onClose, onOpenProduct }: DetailPanelProps) {
  const [detail, setDetail] = useState<ProductDetailData | null>(null);
  const [detailError, setDetailError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [similar, setSimilar] = useState<ProductSummary[] | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!styleNumber) return;
    let cancelled = false;
    setLoading(true);
    setDetailError(null);
    setDetail(null);
    setSimilar(null);
    setImgError(false);

    getProductDetail(styleNumber)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(
          err instanceof ApiError
            ? err
            : new ApiError({ code: "UNKNOWN_ERROR", message: "Something went wrong", status: null }),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getSimilarProducts(styleNumber)
      .then((items) => {
        if (!cancelled) setSimilar(items);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });

    return () => {
      cancelled = true;
    };
  }, [styleNumber]);

  return (
    <Sheet
      open={styleNumber !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-detail">
        <VisuallyHidden>
          <SheetTitle>{detail ? detail.style_name : "Product detail"}</SheetTitle>
        </VisuallyHidden>
        {loading ? (
          <DetailPanelSkeleton />
        ) : detailError ? (
          <div className="p-6 pt-12">
            <EmptyState
              flavor="error"
              title="Couldn't load this product"
              body={detailError.message}
              action={{ label: "Close", onAct: onClose }}
            />
          </div>
        ) : detail ? (
          <div className="flex flex-col">
            <div className="aspect-product w-full bg-bg">
              {imgError ? (
                <CategoryPlaceholder category={detail.category} className="h-full w-full" />
              ) : (
                <img
                  src={detail.image_url}
                  alt={`${detail.style_name} · ${detail.color ?? "uncategorized color"} · ${detail.category ?? "uncategorized"}`}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              )}
            </div>

            <div className="flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-role-title text-text">{detail.style_name}</h2>
                <p className="mt-1 text-role-small text-text-2">
                  {detail.style_number} · {detail.supplier.company_name}
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-role-stat text-text">₹{detail.selling_price.toLocaleString("en-IN")}</span>
                  {detail.cost !== null ? (
                    <span className="text-role-small text-text-2">Cost ₹{detail.cost.toLocaleString("en-IN")}</span>
                  ) : null}
                </div>
              </div>

              <Seam variant="light" />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <SpecRow label="Category" value={detail.category} />
                <SpecRow label="Fabric" value={detail.fabric} />
                <SpecRow label="GSM" value={String(detail.gsm)} />
                <SpecRow label="Color" value={detail.color} />
                <SpecRow label="Print" value={detail.print} />
                <SpecRow label="Season" value={detail.season} />
                <SpecRow label="Brand" value={detail.brand} />
              </dl>

              {detail.tech_pack ? (
                <>
                  <Seam variant="light" />
                  <div>
                    <h3 className="text-role-micro text-text-2">Tech pack</h3>
                    <dl className="mt-3 flex flex-col gap-3">
                      <SpecRow label="Fabric details" value={detail.tech_pack.fabric_details} stacked />
                      <SpecRow label="Construction" value={detail.tech_pack.construction} stacked />
                      <SpecRow label="Wash instructions" value={detail.tech_pack.wash_instructions} stacked />
                    </dl>
                  </div>
                </>
              ) : null}

              <Seam variant="light" />

              <div>
                <h3 className="text-role-micro text-text-2">Supplier</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <SpecRow label="Country" value={detail.supplier.country} />
                  <SpecRow label="Lead time" value={`${detail.supplier.lead_time_days} days`} />
                  <SpecRow label="Rating" value={detail.supplier.rating.toFixed(1)} />
                  {detail.supplier.contact ? <SpecRow label="Contact" value={detail.supplier.contact} /> : null}
                </dl>
              </div>

              <div>
                <h3 className="text-role-micro text-text-2">More like this</h3>
                <div className="mt-3">
                  {similar === null ? (
                    <div className="flex gap-3 overflow-x-auto">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-product w-32 shrink-0" />
                      ))}
                    </div>
                  ) : similar.length === 0 ? (
                    <p className="text-role-small text-text-2">
                      No similar items yet — this style has no similarity data available.
                    </p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {similar.map((item) => (
                        <ProductCard
                          key={item.style_number}
                          product={item}
                          size="compact"
                          onOpen={onOpenProduct}
                          className="w-32 shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SpecRow({ label, value, stacked }: { label: string; value: string | null; stacked?: boolean }) {
  return (
    <div className={stacked ? "flex flex-col gap-1" : undefined}>
      <dt className="text-role-micro text-text-2">{label}</dt>
      <dd className="text-role-small text-text">{value ?? "—"}</dd>
    </div>
  );
}

function DetailPanelSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-product w-full rounded-none" />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-2 h-7 w-24" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
