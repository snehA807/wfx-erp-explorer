import { useEffect } from "react";
import { Factory, IndianRupee, Package, ShoppingCart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ChartCard, ChartCardSkeleton } from "@/components/ChartCard";
import { EmptyState } from "@/components/EmptyState";
import { PageTitle } from "@/components/PageTitle";
import { ResultTable, ResultTableSkeleton } from "@/components/ResultTable";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCrore, formatDate, formatNumber } from "@/lib/format";

import { useStats } from "./useStats";

const RECENT_ORDERS_COLUMNS = ["Order", "Buyer", "Style", "Qty", "Unit price", "Status", "Ship date"];

export default function OverviewPage() {
  useEffect(() => {
    document.title = "Overview · WFX Explorer";
  }, []);

  const { stats, loading, error, retry } = useStats();
  const navigate = useNavigate();

  return (
    <>
      <PageTitle title="Overview" description="Revenue, orders, and category breakdown at a glance." />

      {error ? (
        <EmptyState
          flavor="error"
          title="Couldn't load dashboard data"
          body={error.message}
          action={{ label: "Retry", onAct: retry }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {loading || !stats ? (
              <>
                <StatCardSkeleton hero cascadeIndex={0} className="xl:col-span-2" />
                <StatCardSkeleton cascadeIndex={1} />
                <StatCardSkeleton cascadeIndex={2} />
                <StatCardSkeleton cascadeIndex={3} />
                <StatCardSkeleton cascadeIndex={4} />
              </>
            ) : (
              <>
                <StatCard
                  hero
                  cascadeIndex={0}
                  label="Revenue"
                  value={formatCrore(stats.totals.revenue)}
                  footnote="Excl. cancelled · INR"
                  icon={IndianRupee}
                  className="xl:col-span-2"
                />
                <StatCard
                  cascadeIndex={1}
                  label="Finished goods"
                  value={formatNumber(stats.totals.finished_goods)}
                  icon={Package}
                />
                <StatCard
                  cascadeIndex={2}
                  label="Suppliers"
                  value={formatNumber(stats.totals.suppliers)}
                  icon={Factory}
                />
                <StatCard
                  cascadeIndex={3}
                  label="Buyers"
                  value={formatNumber(stats.totals.buyers)}
                  icon={Users}
                />
                <StatCard
                  cascadeIndex={4}
                  label="Orders"
                  value={formatNumber(stats.totals.orders)}
                  icon={ShoppingCart}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loading || !stats ? (
              <>
                <ChartCardSkeleton />
                <ChartCardSkeleton />
              </>
            ) : (
              <>
                <ChartCard
                  title="Revenue by category"
                  type="hbar"
                  data={stats.revenue_by_category.map((row) => ({
                    key: row.category ?? "Uncategorized",
                    label: row.category ?? "Uncategorized",
                    value: row.revenue,
                  }))}
                  valueFormatter={formatCrore}
                  onSegment={(category) => navigate(`/products?category=${encodeURIComponent(category)}`)}
                />
                <ChartCard
                  title="Orders by status"
                  type="donut"
                  data={stats.order_status_counts.map((row) => ({
                    key: row.status,
                    label: row.status,
                    value: row.count,
                  }))}
                  valueFormatter={formatNumber}
                />
              </>
            )}
          </div>

          <section>
            <h2 className="text-role-title text-text">Recent orders</h2>
            <div className="mt-4">
              {loading || !stats ? (
                <ResultTableSkeleton columns={RECENT_ORDERS_COLUMNS.length} />
              ) : (
                <ResultTable
                  columns={RECENT_ORDERS_COLUMNS}
                  rows={stats.recent_orders.map((order) => [
                    order.order_number,
                    order.buyer_name,
                    `${order.style_number} · ${order.style_name}`,
                    order.quantity,
                    order.unit_price,
                    order.status,
                    order.shipment_date ? formatDate(order.shipment_date) : null,
                  ])}
                  cellRenderer={(column, value, rowIndex) => {
                    if (column === "Status") {
                      return <StatusBadge kind="order" value={stats.recent_orders[rowIndex].status} />;
                    }
                    if (column === "Unit price" && typeof value === "number") {
                      return `₹${value.toLocaleString("en-IN")}`;
                    }
                    if (value === null || value === undefined) {
                      return <span className="text-text-2">—</span>;
                    }
                    return typeof value === "number" ? value.toLocaleString("en-IN") : String(value);
                  }}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
