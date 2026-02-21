import {
  getAllDepotListings,
  isChecked,
  markChecked,
  storeOpportunity,
  getSubscriber,
  redis,
} from "./redis";
import { scrapeEbaySoldListings } from "./ebay-scraper";
import {
  comparePrices,
  createOpportunity,
  createCheckResult,
} from "./arbitrage";
import type { DepopListing } from "./types";

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY || "";
const MAX_EBAY_RESULTS = 5;

async function processListing(depopListing: DepopListing): Promise<void> {
  console.log(`\n[ARBITRAGE] Processing: ${depopListing.title}`);
  console.log(`[ARBITRAGE] Depop price: ${depopListing.price}`);

  const alreadyChecked = await isChecked(depopListing.id);
  if (alreadyChecked) {
    console.log(`[ARBITRAGE] Already checked, skipping...`);
    return;
  }

  try {
    const ebayResult = await scrapeEbaySoldListings({
      apiKey: SCRAPINGBEE_API_KEY,
      query: depopListing.title,
      maxItems: MAX_EBAY_RESULTS,
    });

    if (ebayResult.listings.length === 0) {
      console.log(`[ARBITRAGE] No eBay sold listings found`);
      await markChecked(
        createCheckResult(depopListing.id, "no_opportunity", "No eBay results"),
      );
      return;
    }

    console.log(
      `[ARBITRAGE] Found ${ebayResult.listings.length} eBay sold listings`,
    );

    const comparison = comparePrices(depopListing, ebayResult.listings);

    console.log(
      `[ARBITRAGE] Depop price (USD): $${comparison.depopPriceUSD.toFixed(2)}`,
    );
    console.log(
      `[ARBITRAGE] Best eBay price (USD): $${comparison.ebayPriceUSD.toFixed(2)}`,
    );
    console.log(
      `[ARBITRAGE] Profit: $${comparison.profitAbsolute.toFixed(2)} (${comparison.profitMargin.toFixed(1)}%)`,
    );

    if (comparison.isOpportunity && comparison.bestEbayListing) {
      const opportunity = createOpportunity(
        depopListing,
        comparison.bestEbayListing,
        comparison,
      );

      await storeOpportunity(opportunity);

      await markChecked(
        createCheckResult(
          depopListing.id,
          "opportunity",
          undefined,
          opportunity.id,
        ),
      );

      console.log(`[ARBITRAGE] *** OPPORTUNITY FOUND! ***`);
    } else {
      await markChecked(
        createCheckResult(
          depopListing.id,
          "no_opportunity",
          "No profit margin",
        ),
      );
      console.log(`[ARBITRAGE] No arbitrage opportunity`);
    }
  } catch (error) {
    console.error(`[ARBITRAGE] Error processing listing:`, error);
    await markChecked(
      createCheckResult(
        depopListing.id,
        "error",
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }
}

async function runOnce(): Promise<void> {
  console.log("[ARBITRAGE] Running in --once mode");
  console.log("[ARBITRAGE] Fetching all Depop listings from Redis...");

  const listings = await getAllDepotListings();
  console.log(`[ARBITRAGE] Found ${listings.length} listings in Redis`);

  if (listings.length === 0) {
    console.log("[ARBITRAGE] No listings found. Run the depop-scraper first!");
    return;
  }

  for (const listing of listings) {
    await processListing(listing);
  }

  console.log("\n[ARBITRAGE] Finished processing all listings");
}

async function runService(): Promise<void> {
  console.log(
    "[ARBITRAGE] Starting service mode — listening for new Depop listings...",
  );

  // On startup, drain any existing unchecked listings so we don't miss
  // items that arrived while the service was offline.
  const existing = await getAllDepotListings();
  const unchecked = [];
  for (const listing of existing) {
    if (!(await isChecked(listing.id))) {
      unchecked.push(listing);
    }
  }

  if (unchecked.length > 0) {
    console.log(
      `[ARBITRAGE] Processing ${unchecked.length} unchecked listings from backlog...`,
    );
    for (const listing of unchecked) {
      await processListing(listing);
    }
    console.log("[ARBITRAGE] Backlog cleared.");
  } else {
    console.log(
      "[ARBITRAGE] No backlog — all existing listings already checked.",
    );
  }

  // Subscribe to the channel depop-scraper publishes on when it stores a new listing.
  const subscriber = getSubscriber();
  await subscriber.subscribe("depop:new_listing");
  console.log(
    "[ARBITRAGE] Subscribed to depop:new_listing — waiting for new items...\n",
  );

  subscriber.on("message", async (channel: string, message: string) => {
    if (channel !== "depop:new_listing") return;

    let listing: DepopListing;
    try {
      listing = JSON.parse(message);
    } catch {
      console.error("[ARBITRAGE] Failed to parse pub/sub message:", message);
      return;
    }

    console.log(
      `[ARBITRAGE] New listing received via pub/sub: ${listing.title}`,
    );
    await processListing(listing);
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log("\n[ARBITRAGE] Shutting down...");
    await subscriber.unsubscribe();
    subscriber.disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive
  await new Promise(() => {});
}

function printUsage(): void {
  console.log(`
Arbitrage Checker - Compare Depop prices with eBay sold listings

Usage:
  bun run src/index.ts --once          Run one-time check on all Redis listings then exit
  bun run src/index.ts --service       Run as service listening for new listings via Redis pub/sub

Options:
  --once       Process all existing Depop listings once and exit
  --service    Drain backlog then subscribe to depop:new_listing channel (default)
  --help       Show this help message
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (!SCRAPINGBEE_API_KEY) {
    console.error("[ARBITRAGE] Error: SCRAPINGBEE_API_KEY not set");
    process.exit(1);
  }

  if (args.includes("--once")) {
    await runOnce();
  } else if (args.includes("--service") || args.length === 0) {
    await runService();
  } else {
    printUsage();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[ARBITRAGE] Fatal error:", error);
  process.exit(1);
});
