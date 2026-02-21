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
