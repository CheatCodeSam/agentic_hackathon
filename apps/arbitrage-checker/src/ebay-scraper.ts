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
          render_js: false,
          premium_proxy: true,
          stealth_proxy: true,
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

  // eBay's current SRP uses <li class="s-card s-card--horizontal"> for each listing.
  // Split on the opening <li> tag for each card.
  const splitPattern = /(?=<li[^>]*class="[^"]*s-card[^"]*")/gi;
  const chunks = html.split(splitPattern).slice(1); // first chunk is preamble

  // Strip HTML comments to simplify parsing
  const stripComments = (s: string) => s.replace(/<!--[\s\S]*?-->/g, "");

  for (const rawChunk of chunks) {
    if (listings.length >= maxItems) break;

    const chunk = stripComments(rawChunk);

    // eBay uses unquoted hrefs: href=https://www.ebay.com/itm/...
    // Match s-card__link anchor with either quoted or unquoted href
    const linkMatch =
      chunk.match(/class=s-card__link[^>]+href=(https:\/\/[^\s>'"]+)/i) ||
      chunk.match(/href=(https:\/\/[^\s>'"]+)[^>]*class=s-card__link/i) ||
      chunk.match(/class="[^"]*s-card__link[^"]*"[^>]+href="([^"]+)"/i) ||
      chunk.match(/href="([^"]+)"[^>]*class="[^"]*s-card__link[^"]*"/i);
    if (!linkMatch) continue;

    // Strip query params to get a clean item URL
    const url = linkMatch[1].split("?")[0];
    if (url.includes("/b/") || url.includes("/sch/")) continue;

    const id = generateListingId(url);

    // Title: inside <div class=s-card__title>, the item title is in a span
    // with class like "su-styled-text primary default"
    // Skip "Shop on eBay" placeholder cards (no aria-label="Sold Item")
    if (
      !chunk.includes('aria-label="Sold Item"') &&
      !chunk.includes("Sold Item")
    )
      continue;

    // Extract title from the s-card__title div — look for the primary text span
    const titleDivMatch = chunk.match(
      /<div[^>]*class=s-card__title[^>]*>([\s\S]*?)<\/div>/i,
    );
    let title = "";
    if (titleDivMatch) {
      // The real title is in a span with "primary" class; strip all inner tags
      title = titleDivMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Remove "New Listing" prefix and "Opens in a new window or tab" suffix
      title = title
        .replace(/^New\s+Listing\s*/i, "")
        .replace(/Opens in a new window or tab.*/i, "")
        .trim();
    }
    if (!title || title.toLowerCase().includes("shop on ebay")) continue;

    // Price: <span class="...s-card__price">$59.99</span>
    const priceMatch = chunk.match(
      /<span[^>]*class="[^"]*s-card__price[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const priceText = priceMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const { value: price, currency } = parsePrice(priceText);
    if (price <= 0) continue;

    // Sold date: <span ...aria-label="Sold Item">Sold Feb 21, 2026</span>
    const dateMatch = chunk.match(
      /<span[^>]*aria-label="Sold Item"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const soldDate = dateMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

    // Image: <img class=s-card__image ... src=URL>
    // eBay uses unquoted src on s-card__image
    const imgMatch =
      chunk.match(/class=s-card__image[^>]+src=(https?:\/\/[^\s>'"]+)/i) ||
      chunk.match(/class="[^"]*s-card__image[^"]*"[^>]+src="([^"]+)"/i) ||
      chunk.match(/src="([^"]+)"[^>]*class="[^"]*s-card__image[^"]*"/i);
    // Fallback: alt text matches title on the image near the item link
    const imgAltMatch = chunk.match(
      new RegExp(
        `alt="${title.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*"[^>]*src="([^"]+)"`,
        "i",
      ),
    );
    let imageUrl =
      imgMatch?.[1]?.split("?")[0] || imgAltMatch?.[1]?.split("?")[0] || "";
    // Also try data-defer-load for lazy-loaded images
    if (!imageUrl) {
      const deferMatch = chunk.match(/data-defer-load=(https?:\/\/[^\s>'"]+)/i);
      imageUrl = deferMatch?.[1]?.split("?")[0] || "";
    }

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
