import { getOpportunities } from "@/lib/data";
import OpportunityRow from "../components/OpportunityRow";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  const totalProfit = opportunities.reduce(
    (sum, o) => sum + o.profitAbsolute,
    0,
  );
  const avgMargin =
    opportunities.length > 0
      ? opportunities.reduce((sum, o) => sum + o.profitMargin, 0) /
        opportunities.length
      : 0;
  const bestDeal =
    opportunities.length > 0
      ? opportunities.reduce((best, o) =>
          o.profitAbsolute > best.profitAbsolute ? o : best,
        )
      : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Opportunities</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Items cheaper on Depop than their eBay sold prices
        </p>
      </div>

      {/* Stats */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Total Opportunities
            </p>
            <p className="text-3xl font-bold text-emerald-400">
              {opportunities.length}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Avg Margin
            </p>
            <p className="text-3xl font-bold text-white">
              {avgMargin.toFixed(0)}%
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Best Deal
            </p>
            <p className="text-3xl font-bold text-emerald-400">
              +${bestDeal?.profitAbsolute.toFixed(2) ?? "0.00"}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {opportunities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-16 text-center space-y-3">
          <p className="text-neutral-500 text-sm">
            No arbitrage opportunities found yet.
          </p>
          <p className="text-neutral-600 text-xs">
            Make sure both services are running — the depop-scraper and
            arbitrage-checker.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opportunity) => (
            <OpportunityRow key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}
    </main>
  );
}
