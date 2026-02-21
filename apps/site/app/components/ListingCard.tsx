import type { DepopListing } from "@/lib/types";
import Image from "next/image";

export default function ListingCard({ listing }: { listing: DepopListing }) {
  const date = new Date(listing.scrapedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-600 transition-colors"
    >
      <div className="relative aspect-square bg-neutral-800 overflow-hidden">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-600 text-sm">
            No image
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-neutral-300 backdrop-blur-sm">
          {listing.keyword}
        </span>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-medium text-white leading-snug line-clamp-2">
          {listing.title}
        </p>
        <p className="text-lg font-bold text-emerald-400">{listing.price}</p>
        <p className="text-xs text-neutral-500 mt-1">{date}</p>
      </div>
    </a>
  );
}
