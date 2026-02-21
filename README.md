# dealio

Automated arbitrage finder that scrapes Depop listings, compares them against eBay sold prices, and surfaces profitable flip opportunities through a real-time dashboard.

## How It Works

```
Depop Scraper          Redis (pub/sub)          Arbitrage Checker
+--------------+       +---------------+        +------------------+
| Scrapes Depop| ----> | depop:listing  | -----> | Compares against |
| for keywords |       | depop:new_listing       | eBay sold prices |
+--------------+       +---------------+        +------------------+
                              |                         |
                              v                         v
                       +---------------+        +------------------+
                       | Next.js Site  | <----- | arbitrage:       |
                       | (Dashboard)   |        | opportunity      |
                       +---------------+        +------------------+
```

1. **Depop Scraper** continuously scrapes Depop search results for configured keywords via [ScrapingBee](https://www.scrapingbee.com/)
2. New listings are stored in Redis and published to a `depop:new_listing` pub/sub channel
3. **Arbitrage Checker** subscribes to that channel, takes each listing title, and scrapes eBay's sold/completed listings for comparable items
4. If the eBay sold price exceeds the Depop asking price, it's flagged as an arbitrage opportunity
5. The **Next.js dashboard** reads everything from Redis and displays listings, opportunities, profit margins, and tracked keywords

## Project Structure

```
apps/
  depop-scraper/       Depop search scraper (Bun + ScrapingBee)
  arbitrage-checker/   eBay sold price comparator (Bun + ScrapingBee)
  site/                Dashboard UI (Next.js 16 + Tailwind CSS)
docker-compose.yml     Redis 7 service
```

## Prerequisites

- [Bun](https://bun.sh/) v1.3+
- [Docker](https://www.docker.com/) (for Redis)
- [ScrapingBee](https://www.scrapingbee.com/) API key

## Getting Started

### 1. Install dependencies

```sh
bun install
```

### 2. Start Redis

```sh
docker compose up -d
```

### 3. Configure environment variables

Create `.env` files in both service directories:

```sh
# apps/depop-scraper/.env
SCRAPINGBEE_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379

# apps/arbitrage-checker/.env
SCRAPINGBEE_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379
```

### 4. Start the services

Start the arbitrage checker first so it's subscribed before listings arrive:

```sh
# Terminal 1 - Arbitrage checker (subscribes to new listings)
cd apps/arbitrage-checker
bun run start --service

# Terminal 2 - Depop scraper (scrapes and publishes listings)
cd apps/depop-scraper
bun run start --keyword "vintage polo ralph lauren"

# Terminal 3 - Dashboard
cd apps/site
bun run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000).

## Usage

### Depop Scraper

```sh
# Continuous mode (scrapes every ~2-3 minutes with jitter)
bun run start --keyword "carhartt workwear"

# Single scrape for testing
bun run start --keyword "nike vintage" --once
```

### Arbitrage Checker

```sh
# Service mode - subscribes to pub/sub and processes new listings in real-time
bun run start --service

# One-shot mode - checks all existing unchecked listings then exits
bun run start --once
```

### Dashboard

The site has three pages:

- **Dashboard** (`/`) -- stats overview, recent opportunities, and latest scraped listings
- **Listings** (`/listings`) -- all scraped Depop listings grouped by keyword
- **Opportunities** (`/opportunities`) -- all arbitrage opportunities sorted by profit, with links to both the Depop and eBay listings

## Tech Stack

- **Runtime:** Bun
- **Monorepo:** Turborepo
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Data:** Redis 7 (pub/sub + key-value storage)
- **Scraping:** ScrapingBee (premium proxies, JS rendering)
- **Language:** TypeScript
