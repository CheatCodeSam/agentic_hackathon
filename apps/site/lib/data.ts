import { redis } from "./redis";
import type { DepopListing, ArbitrageOpportunity } from "./types";

export async function getListings(): Promise<DepopListing[]> {
  const keys = await redis.keys("depop:listing:*");
  if (keys.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const key of keys) pipeline.get(key);
  const results = await pipeline.exec();

  const listings: DepopListing[] = [];
  for (const result of results ?? []) {
    const [err, data] = result;
    if (!err && data) {
      try {
        listings.push(JSON.parse(data as string));
      } catch {}
    }
  }

  return listings.sort((a, b) => b.scrapedAt - a.scrapedAt);
}

export async function getOpportunities(): Promise<ArbitrageOpportunity[]> {
  const keys = await redis.keys("arbitrage:opportunity:*");
  if (keys.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const key of keys) pipeline.get(key);
  const results = await pipeline.exec();

  const opportunities: ArbitrageOpportunity[] = [];
  for (const result of results ?? []) {
    const [err, data] = result;
    if (!err && data) {
      try {
        opportunities.push(JSON.parse(data as string));
      } catch {}
    }
  }

  return opportunities.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getStats(): Promise<{
  listingCount: number;
  opportunityCount: number;
  keywords: string[];
  lastScrapedAt: number | null;
}> {
  const [listings, opportunities] = await Promise.all([
    getListings(),
    getOpportunities(),
  ]);

  const keywords = [...new Set(listings.map((l) => l.keyword))];
  const lastScrapedAt =
    listings.length > 0 ? Math.max(...listings.map((l) => l.scrapedAt)) : null;

  return {
    listingCount: listings.length,
    opportunityCount: opportunities.length,
    keywords,
    lastScrapedAt,
  };
}
