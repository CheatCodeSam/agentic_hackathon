import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-neutral-800 bg-neutral-950 px-6 py-4">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white">
            deal<span className="text-emerald-400">io</span>
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/listings"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Listings
          </Link>
          <Link
            href="/opportunities"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Opportunities
          </Link>
        </div>
      </div>
    </nav>
  );
}
