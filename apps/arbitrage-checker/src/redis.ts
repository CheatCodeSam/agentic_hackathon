import Redis from "ioredis";
import type { DepopListing, ArbitrageOpportunity, CheckResult } from "./types";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

// Separate connection required for subscribe mode — a subscribed client
// cannot issue regular commands on the same connection.
let _subscriber: Redis | null = null;
export function getSubscriber(): Redis {
  if (!_subscriber) {
    _subscriber = new Redis(redisUrl);
  }
  return _subscriber;
}

export async function getAllDepotListings(): Promise<DepopListing[]> {
  const keys = await redis.keys("depop:listing:*");
  if (keys.length === 0) {
    return [];
  }

  const listings: DepopListing[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      try {
        listings.push(JSON.parse(data));
      } catch (e) {
        console.error(`[REDIS] Failed to parse listing ${key}:`, e);
      }
    }
  }

  return listings.sort((a, b) => b.scrapedAt - a.scrapedAt);
}

export async function getDepotListing(
  id: string,
): Promise<DepopListing | null> {
  const data = await redis.get(`depop:listing:${id}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function isChecked(listingId: string): Promise<boolean> {
  return (await redis.exists(`arbitrage:checked:${listingId}`)) === 1;
}

export async function getCheckedResult(
  listingId: string,
): Promise<CheckResult | null> {
  const data = await redis.get(`arbitrage:checked:${listingId}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function markChecked(result: CheckResult): Promise<void> {
  const key = `arbitrage:checked:${result.depopListingId}`;
  await redis.set(key, JSON.stringify(result));
  console.log(
    `[REDIS] Marked as checked: ${result.depopListingId} (${result.result})`,
  );
}

export async function storeOpportunity(
  opportunity: ArbitrageOpportunity,
): Promise<void> {
  const key = `arbitrage:opportunity:${opportunity.id}`;
  await redis.set(key, JSON.stringify(opportunity));

  await redis.publish("arbitrage:new_opportunity", JSON.stringify(opportunity));

  console.log(
    `[REDIS] Stored opportunity: ${opportunity.depopTitle} -> ${opportunity.ebayTitle}`,
  );
  console.log(
    `[REDIS] Profit: ${opportunity.profitAbsolute} ${opportunity.depopCurrency} (${opportunity.profitMargin.toFixed(1)}% margin)`,
  );
}

export async function getOpportunities(): Promise<ArbitrageOpportunity[]> {
  const keys = await redis.keys("arbitrage:opportunity:*");
  if (keys.length === 0) {
    return [];
  }

  const opportunities: ArbitrageOpportunity[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      try {
        opportunities.push(JSON.parse(data));
      } catch (e) {
        console.error(`[REDIS] Failed to parse opportunity ${key}:`, e);
      }
    }
  }

  return opportunities.sort((a, b) => b.createdAt - a.createdAt);
}

export { redis };
