# QuickBite: Restaurant Pickup Platform

COMP 354, Assignment 2, Team 28. A small web app where customers order food for pickup
and restaurant staff track orders through **Received → Preparing → Ready for Pickup → Completed**.

Project board: https://github.com/users/karmidd/projects/2

## Setup

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/karmidd/quickbite-team28.git
cd quickbite-team28
npm install
npm start
```

Open http://localhost:3000.

| Command | What it does |
|---|---|
| `npm start` | Start the server on port 3000 |
| `npm run dev` | Start the server and restart it whenever a file changes |
| `npm test` | Run all automated tests |
| `npm run reset-db` | Throw away test orders and go back to the seed data |

## Project structure

```
server.js            Starts the server
src/app.js           Express app: page serving + all /api routes
src/store.js         Reads and writes the data file; defines order STATUSES
data/seed.json       Starting data (committed)
data/db.json         Live data, created from seed.json on first run (not committed)
public/              The pages (plain HTML/CSS/JS) and style.css
tests/               Vitest tests, one file per feature
```

| Page | PBI | Owner |
|---|---|---|
| `public/index.html` | PBI-02 restaurant list | Mayar |
| `public/menu.html` | PBI-03 menu | Mayar |
| `public/checkout.html` | PBI-04/05/06 cart, pickup time, place order | Nicolas |
| `public/dashboard.html` | PBI-07/08 dashboard and status updates | Roman |
| `public/status.html` | PBI-09 customer order status | Karam |

## Data model

All data is in one JSON file with three lists. Prices are stored in **cents** (`1295` = $12.95)
to avoid rounding errors.

- **restaurants**: `id`, `name`, `cuisine`, `address`
- **menuItems**: `id`, `restaurantId`, `name`, `description`, `priceCents`
- **orders**: `id`, `restaurantId`, `customerName`, `items`, `totalCents`, `pickupTime` (ISO date),
  `status`, `createdAt`
  - each item in `items`: `menuItemId`, `name`, `priceCents`, `quantity` (name and price are copied
    so old orders don't change if the menu does)

Valid statuses are the `STATUSES` list in `src/store.js`. Always use that list rather than typing
status names by hand.

## API

| Route | PBI | Does |
|---|---|---|
| `GET /api/restaurants` | 02 | List restaurants ✅ |
| `GET /api/restaurants/:id/menu` | 03 | Menu items for one restaurant (404 if unknown) ✅ |
| `POST /api/orders` | 06 | Create an order (status starts as `Received`) ✅ |
| `GET /api/orders/:id` | 09 | One order (404 if unknown) ✅ |
| `GET /api/restaurants/:id/orders` | 07 | A restaurant's orders, sorted by pickup time |
| `PATCH /api/orders/:id/status` | 08 | Move the status forward one step only |

## How we work

1. Move your card to **In Progress** on the board.
2. Branch from `main`: `git checkout -b feature/pbi-XX-short-name`
3. Commit in small steps with clear messages (`feat: ...`, `fix: ...`, `test: ...`).
4. Run `npm test` before pushing.
5. Push and open a pull request. Write `Closes #XX` in the description to link the PBI.
6. Move the card to **In Review**. A teammate must approve before merging (`main` is protected).
7. Check the Definition of Done on the issue, then merge.
