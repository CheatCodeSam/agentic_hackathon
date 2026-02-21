import type { ArbitrageOpportunity } from "@/lib/types";
import Image from "next/image";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

function fmt(price: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${sym}${price.toFixed(2)}`;
}

export default function OpportunityRow({
  opportunity,
}: {
  opportunity: ArbitrageOpportunity;
}) {
  const profitColor =
    opportunity.profitAbsolute > 20
      ? "text-emerald-400"
      : opportunity.profitAbsolute > 10
        ? "text-yellow-400"
        : "text-emerald-300";

  const date = new Date(opportunity.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700 transition-colors">
      {/* Depop side */}
      <a
        href={opportunity.depopUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 flex-1 min-w-0 group"
      >
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800">
          {opportunity.depopImageUrl ? (
            <Image
              src={opportunity.depopImageUrl}
              alt={opportunity.depopTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-600 text-xs">
              —
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-400 mb-0.5">
            Depop
          </span>
          <p className="text-sm text-white font-medium line-clamp-2 leading-snug">
            {opportunity.depopTitle}
          </p>
          <p className="text-base font-bold text-white mt-1">
            {fmt(opportunity.depopPrice, opportunity.depopCurrency)}
          </p>
        </div>
      </a>

      {/* Arrow + profit */}
      <div className="flex sm:flex-col items-center justify-center gap-1 sm:px-4 px-0">
        <span className="text-neutral-500 text-xl">→</span>
        <div className="flex flex-col items-center">
          <span className={`text-lg font-bold ${profitColor}`}>
            +${opportunity.profitAbsolute.toFixed(2)}
          </span>
          <span className={`text-xs font-medium ${profitColor}`}>
            {opportunity.profitMargin.toFixed(0)}% margin
          </span>
        </div>
      </div>

      {/* eBay side */}
      <a
        href={opportunity.ebayUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 flex-1 min-w-0 group"
      >
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-0.5">
            eBay Sold
          </span>
          <p className="text-sm text-white font-medium line-clamp-2 leading-snug">
            {opportunity.ebayTitle}
          </p>
          <p className="text-base font-bold text-white mt-1">
            {fmt(opportunity.ebayPrice, opportunity.ebayCurrency)}
          </p>
          {opportunity.ebaySoldDate && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Sold: {opportunity.ebaySoldDate}
            </p>
          )}
        </div>
      </a>

      {/* Timestamp */}
      <div className="flex sm:flex-col items-end justify-center text-xs text-neutral-600 text-right flex-shrink-0">
        {date}
      </div>
    </div>
  );
}
