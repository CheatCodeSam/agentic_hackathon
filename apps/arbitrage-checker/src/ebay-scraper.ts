import scrapingbee from "scrapingbee";
import type {
  EbaySoldListing,
  EbayScraperConfig,
  EbayScraperResult,
} from "./types";

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
        `[EBAY-SCRAPER] Attempt ${attempt}/${maxRetries} failed (status: ${status || "unknown"})`,
      );

      if (attempt < maxRetries) {
        const delay = attempt * 5000;
        console.log(`[EBAY-SCRAPER] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error("Max retries exceeded");
}

function parsePrice(priceStr: string): { value: number; currency: string } {
  const cleaned = priceStr.replace(/,/g, "").trim();

  if (cleaned.includes("£") || cleaned.includes("GBP")) {
    const value = parseFloat(cleaned.replace(/[£GBP\s]/g, ""));
    return { value: isNaN(value) ? 0 : value, currency: "GBP" };
  }

  if (cleaned.includes("$") || cleaned.includes("USD")) {
    const value = parseFloat(cleaned.replace(/[\$USD\s]/g, ""));
    return { value: isNaN(value) ? 0 : value, currency: "USD" };
  }

  if (cleaned.includes("€") || cleaned.includes("EUR")) {
    const value = parseFloat(cleaned.replace(/[€EUR\s]/g, ""));
    return { value: isNaN(value) ? 0 : value, currency: "EUR" };
  }

  const value = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
  return { value: isNaN(value) ? 0 : value, currency: "USD" };
}

function parseSoldListingsFromHtml(
  html: string,
  maxItems: number,
): EbaySoldListing[] {
  const listings: EbaySoldListing[] = [];

  const itemPattern =
    /<li[^>]*class="[^"]*s-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const itemMatches = [...html.matchAll(itemPattern)].slice(0, maxItems + 5);

  for (const itemMatch of itemMatches) {
    if (listings.length >= maxItems) break;

    const itemHtml = itemMatch[1];

    const linkMatch = itemHtml.match(
      /<a[^>]*href="([^"]+)"[^>]*class="[^"]*s-item__link[^"]*"/i,
    );
    if (!linkMatch) continue;
    const url = linkMatch[1].split("?")[0];

    if (url.includes("/b/") || url.includes("/sch/")) continue;

    const id = generateListingId(url);

    const titleMatch = itemHtml.match(
      /<h3[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
    );
    let title = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    if (title.toLowerCase().includes("shop on ebay") || !title) continue;

    const priceMatch = itemHtml.match(
      /<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const priceText = priceMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const { value: price, currency } = parsePrice(priceText);
    if (price <= 0) continue;

    const dateMatch = itemHtml.match(
      /<span[^>]*class="[^"]*s-item__title--tagblock[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const soldDate = dateMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

    const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"/i);
    const imageUrl = imgMatch?.[1]?.split("?")[0] || "";

    listings.push({
      id,
      title,
      price,
      currency,
      soldDate,
      url,
      imageUrl,
    });
  }

  return listings;
}

export async function scrapeEbaySoldListings(
  config: EbayScraperConfig,
): Promise<EbayScraperResult> {
  const encodedQuery = encodeURIComponent(config.query);
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Sold=1&LH_Complete=1&_ipg=60`;

  console.log(
    `[EBAY-SCRAPER] Scraping eBay sold listings for: "${config.query}"`,
  );
  console.log(`[EBAY-SCRAPER] URL: ${ebayUrl}`);

  try {
    const html = await scrapeWithScrapingBee(ebayUrl, config.apiKey);
    const listings = parseSoldListingsFromHtml(html, config.maxItems);

    console.log(`[EBAY-SCRAPER] Found ${listings.length} sold listings`);

    return {
      listings,
      totalFound: listings.length,
      scrapedAt: Date.now(),
    };
  } catch (error) {
    console.error("[EBAY-SCRAPER] Error:", error);
    throw error;
  }
}
