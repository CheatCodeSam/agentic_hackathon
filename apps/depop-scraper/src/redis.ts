import Redis from "ioredis";
import type { DepopListing } from "./types";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

export async function isListingSeen(
  url: string,
  keyword: string,
): Promise<boolean> {
  const key = `depop:seen:${keyword}`;
  return (await redis.sismember(key, url)) === 1;
}

export async function markListingSeen(
  url: string,
  keyword: string,
): Promise<void> {
  const key = `depop:seen:${keyword}`;
  await redis.sadd(key, url);
}

export async function storeListing(listing: DepopListing): Promise<void> {
  const key = `depop:listing:${listing.id}`;
  await redis.set(key, JSON.stringify(listing));
  const subscriberCount = await redis.publish(
    "depop:new_listing",
    JSON.stringify(listing),
  );
  console.log(
    `[REDIS] Stored listing: ${listing.title} - ${listing.price} (published to ${subscriberCount} subscriber(s))`,
  );
}

export async function getListingCount(keyword: string): Promise<number> {
  const key = `depop:seen:${keyword}`;
  return redis.scard(key);
}

export async function storeListings(
  listings: DepopListing[],
  keyword: string,
): Promise<number> {
  let newCount = 0;
  for (const listing of listings) {
    if (listing.price === "Price not found") {
      console.log(`[REDIS] Skipping listing without price: ${listing.title}`);
      continue;
    }
    const seen = await isListingSeen(listing.url, keyword);
    if (!seen) {
      await storeListing(listing);
      await markListingSeen(listing.url, keyword);
      newCount++;
    } else {
      console.log(`[REDIS] Skipping duplicate: ${listing.title}`);
    }
  }
  return newCount;
}

export { redis };
