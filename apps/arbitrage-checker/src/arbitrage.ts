import type {
  DepopListing,
  EbaySoldListing,
  ArbitrageOpportunity,
  CheckResult,
} from "./types";

const GBP_TO_USD = 1.27;
const EUR_TO_USD = 1.08;

export function normalizePriceToUSD(price: number, currency: string): number {
  switch (currency.toUpperCase()) {
    case "GBP":
      return price * GBP_TO_USD;
    case "EUR":
      return price * EUR_TO_USD;
    case "USD":
    default:
      return price;
  }
}

export function parsePriceFromDepot(priceStr: string): {
  value: number;
  currency: string;
} {
  const cleaned = priceStr.replace(/,/g, "").trim();

  if (cleaned.includes("£") || cleaned.toUpperCase().includes("GBP")) {
    const value = parseFloat(cleaned.replace(/[£GBP\s]/gi, ""));
    return { value: isNaN(value) ? 0 : value, currency: "GBP" };
  }

  if (cleaned.includes("$") || cleaned.toUpperCase().includes("USD")) {
    const value = parseFloat(cleaned.replace(/[\$USD\s]/gi, ""));
    return { value: isNaN(value) ? 0 : value, currency: "USD" };
  }

  if (cleaned.includes("€") || cleaned.toUpperCase().includes("EUR")) {
    const value = parseFloat(cleaned.replace(/[€EUR\s]/gi, ""));
    return { value: isNaN(value) ? 0 : value, currency: "EUR" };
  }

  const value = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
  return { value: isNaN(value) ? 0 : value, currency: "USD" };
}

export interface ComparisonResult {
  isOpportunity: boolean;
  depopPriceUSD: number;
  ebayPriceUSD: number;
  profitAbsolute: number;
  profitMargin: number;
  bestEbayListing: EbaySoldListing | null;
}

export function comparePrices(
  depopListing: DepopListing,
  ebayListings: EbaySoldListing[],
): ComparisonResult {
  const { value: depopPrice, currency: depopCurrency } = parsePriceFromDepot(
    depopListing.price,
  );
  const depopPriceUSD = normalizePriceToUSD(depopPrice, depopCurrency);

  if (ebayListings.length === 0) {
    return {
      isOpportunity: false,
      depopPriceUSD,
      ebayPriceUSD: 0,
      profitAbsolute: 0,
      profitMargin: 0,
      bestEbayListing: null,
    };
  }

  const ebayPricesUSD = ebayListings.map((l) => ({
    listing: l,
    priceUSD: normalizePriceToUSD(l.price, l.currency),
  }));

  ebayPricesUSD.sort((a, b) => b.priceUSD - a.priceUSD);

  const bestMatch = ebayPricesUSD[0];
  const ebayPriceUSD = bestMatch.priceUSD;

  const profitAbsolute = ebayPriceUSD - depopPriceUSD;
  const profitMargin =
    depopPriceUSD > 0 ? (profitAbsolute / depopPriceUSD) * 100 : 0;

  return {
    isOpportunity: profitAbsolute > 0,
    depopPriceUSD,
    ebayPriceUSD,
    profitAbsolute,
    profitMargin,
    bestEbayListing: bestMatch.listing,
  };
}

export function createOpportunity(
  depopListing: DepopListing,
  ebayListing: EbaySoldListing,
  comparison: ComparisonResult,
): ArbitrageOpportunity {
  const hash = new Bun.CryptoHasher("md5");
  hash.update(`${depopListing.id}-${ebayListing.id}`);
  const id = hash.digest("hex");

  return {
    id,
    depopListingId: depopListing.id,
    depopTitle: depopListing.title,
    depopPrice: parsePriceFromDepot(depopListing.price).value,
    depopCurrency: parsePriceFromDepot(depopListing.price).currency,
    depopUrl: depopListing.url,
    depopImageUrl: depopListing.imageUrl,
    ebayTitle: ebayListing.title,
    ebayPrice: ebayListing.price,
    ebayCurrency: ebayListing.currency,
    ebayUrl: ebayListing.url,
    ebaySoldDate: ebayListing.soldDate,
    profitMargin: comparison.profitMargin,
    profitAbsolute: comparison.profitAbsolute,
    createdAt: Date.now(),
  };
}

export function createCheckResult(
  depopListingId: string,
  result: "opportunity" | "no_opportunity" | "error",
  reason?: string,
  opportunityId?: string,
): CheckResult {
  return {
    depopListingId,
    checkedAt: Date.now(),
    result,
    reason,
    opportunityId,
  };
}
