import { getStats, getListings, getOpportunities } from "@/lib/data";
import ListingCard from "./components/ListingCard";
import OpportunityRow from "./components/OpportunityRow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, listings, opportunities] = await Promise.all([
    getStats(),
    getListings(),
    getOpportunities(),
  ]);

  const lastScrape = stats.lastScrapedAt
    ? new Date(stats.lastScrapedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Last scrape: {lastScrape}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Listings scraped" value={stats.listingCount} />
        <StatCard
          label="Opportunities"
          value={stats.opportunityCount}
          highlight={stats.opportunityCount > 0}
        />
        <StatCard label="Keywords tracked" value={stats.keywords.length} />
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
            Keywords
          </p>
          <div className="flex flex-wrap gap-1">
            {stats.keywords.length === 0 ? (
              <span className="text-neutral-600 text-sm">None yet</span>
            ) : (
              stats.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                >
                  {kw}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent opportunities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Recent Opportunities
          </h2>
          <a
            href="/opportunities"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all →
          </a>
        </div>
        {opportunities.length === 0 ? (
          <EmptyState message="No arbitrage opportunities found yet. Keep the scrapers running!" />
        ) : (
          <div className="space-y-3">
            {opportunities.slice(0, 5).map((o) => (
              <OpportunityRow key={o.id} opportunity={o} />
            ))}
          </div>
        )}
      </section>

      {/* Recent listings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recently Scraped</h2>
          <a
            href="/listings"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all →
          </a>
        </div>
        {listings.length === 0 ? (
          <EmptyState message="No listings scraped yet. Start the depop-scraper service!" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {listings.slice(0, 6).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p
        className={`text-3xl font-bold ${highlight ? "text-emerald-400" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center">
      <p className="text-neutral-500 text-sm">{message}</p>
    </div>
  );
}
