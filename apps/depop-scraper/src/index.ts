import { scrapeDepop } from "./scraper";
import { storeListings, redis } from "./redis";

const BASE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_JITTER_MS = 60 * 1000;
const MAX_ITEMS_PER_SCRAPE = 3;

function parseArgs(): { keyword: string; once: boolean } {
  const args = process.argv.slice(2);
  let keyword = "";
  let once = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--keyword" || args[i] === "-k") {
      keyword = args[i + 1] || "";
      i++;
    } else if (args[i] === "--once") {
      once = true;
    }
  }

  if (!keyword) {
    console.error("Error: --keyword argument is required");
    console.error('Usage: bun run src/index.ts --keyword "shirt" [--once]');
    process.exit(1);
  }

  return { keyword, once };
}

function getRandomJitter(): number {
  return Math.floor(Math.random() * MAX_JITTER_MS);
}

async function runScrape(keyword: string): Promise<number> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    console.error(
      "Error: SCRAPINGBEE_API_KEY environment variable is required",
    );
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Starting scrape for keyword: "${keyword}"`);

  try {
    const result = await scrapeDepop({
      apiKey,
      keyword,
      maxItems: MAX_ITEMS_PER_SCRAPE,
    });

    console.log("\n[MAIN] Scraped Listings:");
    console.log("-".repeat(60));
    for (const listing of result.listings) {
      console.log(`  Title: ${listing.title}`);
      console.log(`  Price: ${listing.price}`);
      console.log(`  URL: ${listing.url}`);
      console.log(`  Image: ${listing.imageUrl}`);
      console.log("-".repeat(60));
    }

    if (result.listings.length > 0) {
      const newCount = await storeListings(result.listings, keyword);
      console.log(`[MAIN] Stored ${newCount} new listings in Redis`);
      return newCount;
    } else {
      console.log("[MAIN] No listings found");
      return 0;
    }
  } catch (error) {
    console.error("[MAIN] Scrape failed:", error);
    throw error;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const { keyword, once } = parseArgs();

  console.log("=".repeat(60));
  console.log("Depop Scraper Service");
  console.log("=".repeat(60));
  console.log(`Keyword: ${keyword}`);
  console.log(`Mode: ${once ? "Run once (testing)" : "Continuous service"}`);
  if (!once) {
    console.log(
      `Interval: ${BASE_INTERVAL_MS / 1000}s (with up to ${MAX_JITTER_MS / 1000}s jitter)`,
    );
  }
  console.log(`Max items per scrape: ${MAX_ITEMS_PER_SCRAPE}`);
  console.log("=".repeat(60));

  try {
    await redis.ping();
    console.log("[MAIN] Redis connection established");
  } catch {
    console.error("[MAIN] Failed to connect to Redis. Is it running?");
    console.error("[MAIN] Run: docker compose up -d");
    process.exit(1);
  }

  await runScrape(keyword);

  if (once) {
    console.log("\n[MAIN] Single run completed. Exiting.");
    await redis.quit();
    return;
  }

  let iteration = 1;
  while (true) {
    const jitter = getRandomJitter();
    const delay = BASE_INTERVAL_MS + jitter;

    console.log(
      `\n[MAIN] Next scrape in ${Math.round(delay / 1000)}s (jitter: ${Math.round(jitter / 1000)}s)`,
    );

    await sleep(delay);

    iteration++;
    await runScrape(keyword);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
