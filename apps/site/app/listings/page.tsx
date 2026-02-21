import { getListings } from "@/lib/data";
import ListingCard from "../components/ListingCard";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const listings = await getListings();

  // Group by keyword
  const grouped = listings.reduce<Record<string, typeof listings>>(
    (acc, listing) => {
      const key = listing.keyword || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(listing);
      return acc;
    },
    {},
  );

  const keywords = Object.keys(grouped).sort();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Listings</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            {listings.length} items scraped from Depop
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
            >
              {kw}{" "}
              <span className="text-neutral-500">({grouped[kw].length})</span>
            </span>
          ))}
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-16 text-center">
          <p className="text-neutral-500 text-sm">
            No listings yet. Start the depop-scraper service!
          </p>
          <code className="mt-4 block text-xs text-neutral-600">
            cd apps/depop-scraper && bun run src/index.ts --keyword "shirt"
          </code>
        </div>
      ) : (
        keywords.map((keyword) => (
          <section key={keyword}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-sm text-neutral-300">
                {keyword}
              </span>
              <span className="text-neutral-600 text-sm font-normal">
                {grouped[keyword].length} items
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {grouped[keyword].map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
