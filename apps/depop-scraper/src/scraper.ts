import scrapingbee from "scrapingbee";
import type { DepopListing, ScraperConfig, ScraperResult } from "./types";

function generateListingId(url: string): string {
  const hash = new Bun.CryptoHasher("md5");
  hash.update(url);
  return hash.digest("hex");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeWithScrapingBee(
  url: string,
  apiKey: string,
  maxRetries = 3,
): Promise<string> {
  const client = new scrapingbee.ScrapingBeeClient(apiKey);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.htmlApi({
        url: url,
        params: {
          render_js: true,
          wait: 3000,
        },
      });
      const decoder = new TextDecoder();
      return decoder.decode(response.data);
    } catch (error: any) {
      const status = error?.response?.status;
      console.log(
        `[SCRAPER] Attempt ${attempt}/${maxRetries} failed (status: ${status || "unknown"})`,
      );

      if (attempt < maxRetries) {
        const delay = attempt * 5000;
        console.log(`[SCRAPER] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error("Max retries exceeded");
}

function parseListingsFromHtml(
  html: string,
  keyword: string,
  maxItems: number,
): DepopListing[] {
  const listings: DepopListing[] = [];

  const productPattern = /<a[^>]*href="(\/products\/[^"]+)"[^>]*>/gi;
  const matches = [...html.matchAll(productPattern)].slice(0, maxItems);

  for (const match of matches) {
    const productPath = match[1];
    const fullUrl = `https://www.depop.com${productPath}`;
    const id = generateListingId(fullUrl);

    const contextStart = Math.max(0, match.index! - 500);
    const contextEnd = Math.min(
      html.length,
      match.index! + match[0].length + 500,
    );
    const context = html.slice(contextStart, contextEnd);

    const titleMatch =
      context.match(/alt="([^"]+)"/i) || context.match(/title="([^"]+)"/i);
    const title = titleMatch?.[1]?.trim() || "Unknown Item";

    const priceMatch =
      context.match(/£[\d,.]+/i) ||
      context.match(/\$[\d,.]+/i) ||
      context.match(/€[\d,.]+/i);
    const price = priceMatch?.[0] || "Price not found";

    const imgMatch = context.match(
      /src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    );
    const imageUrl = imgMatch?.[1]?.split("?")[0] || "";

    listings.push({
      id,
      title,
      price,
      currency: price.startsWith("£")
        ? "GBP"
        : price.startsWith("$")
          ? "USD"
          : "GBP",
      url: fullUrl,
      imageUrl,
      scrapedAt: Date.now(),
      keyword,
    });
  }

  return listings;
}

export async function scrapeDepop(
  config: ScraperConfig,
): Promise<ScraperResult> {
  const encodedKeyword = encodeURIComponent(config.keyword);
  const depopUrl = `https://www.depop.com/search/?q=${encodedKeyword}`;

  console.log(`[SCRAPER] Scraping Depop for: "${config.keyword}"`);
  console.log(`[SCRAPER] URL: ${depopUrl}`);

  try {
    const html = await scrapeWithScrapingBee(depopUrl, config.apiKey);
    const listings = parseListingsFromHtml(
      html,
      config.keyword,
      config.maxItems,
    );

    console.log(`[SCRAPER] Found ${listings.length} listings`);

    return {
      listings,
      totalFound: listings.length,
      scrapedAt: Date.now(),
    };
  } catch (error) {
    console.error("[SCRAPER] Error:", error);
    throw error;
  }
}
