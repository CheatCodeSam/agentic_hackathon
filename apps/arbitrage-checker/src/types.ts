export interface DepopListing {
  id: string;
  title: string;
  price: string;
  currency: string;
  url: string;
  imageUrl: string;
  scrapedAt: number;
  keyword: string;
}

export interface EbaySoldListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  url: string;
  imageUrl: string;
}

export interface ArbitrageOpportunity {
  id: string;
  depopListingId: string;
  depopTitle: string;
  depopPrice: number;
  depopCurrency: string;
  depopUrl: string;
  depopImageUrl: string;
  ebayTitle: string;
  ebayPrice: number;
  ebayCurrency: string;
  ebayUrl: string;
  ebaySoldDate: string;
  profitMargin: number;
  profitAbsolute: number;
  createdAt: number;
}

export interface CheckResult {
  depopListingId: string;
  checkedAt: number;
  result: "opportunity" | "no_opportunity" | "error";
  reason?: string;
  opportunityId?: string;
}

export interface EbayScraperConfig {
  apiKey: string;
  query: string;
  maxItems: number;
}

export interface EbayScraperResult {
  listings: EbaySoldListing[];
  totalFound: number;
  scrapedAt: number;
}
