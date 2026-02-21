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

export interface ScraperConfig {
  apiKey: string;
  keyword: string;
  maxItems: number;
}

export interface ScraperResult {
  listings: DepopListing[];
  totalFound: number;
  scrapedAt: number;
}
