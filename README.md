# Baha Content Studio

A private, Arabic-first real estate content studio for Baha Al-Sharif and his content manager. The interface is Arabic (RTL) by default, with English as an optional interface language. The language of generated content (Arabic, English or both) is a separate setting.

Design source: [approved Figma design](https://www.figma.com/design/FME8x2ZiMNPcsoTl9J3EE3?node-id=26-10), page "02 · Light Mode — All screens".

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # news feed parser and duplicate-detection checks
```

Optional, for Arabic news summaries: create `.env.local` with `ANTHROPIC_API_KEY=...` and restart. Without it the news page still works and shows the original English text.

Sign in with either account. Version 1 uses one temporary local password, `studio` (override it with `LOCAL_PASSWORD`). Account settings are stored in `data/db.json`, which is created on first run and not committed.

## What is built

| Step | Status |
| --- | --- |
| 1. Foundation: RTL shell, Arabic/English interface, login, Settings, Dashboard | Done |
| 2. News monitor (official sources) | Done |
| 3. Market analysis + opportunities | Next |
| 4. Reels + Carousel studios | Planned |
| 5. Library + calendar | Planned |

Figures and headlines on the dashboard are sample content from the design and are labelled as such in the app.

## News monitor (step 2)

`/news` pulls official feeds on the server. Nothing is scraped or invented: every story keeps its source link, publisher and the date given by the feed (or says the source gave no date).

| Source | Feed | Credentials |
| --- | --- | --- |
| Bank of Canada | Press releases RSS | None |
| TRREB | News releases RSS | None |
| Statistics Canada | The Daily Atom feeds: Housing, Prices, Construction | None |
| Government of Canada | Canada News Centre API (Atom), filtered to housing, rates and prices; includes CMHC and Finance Canada | None |

Not connected, and listed as such in the app: CREA (no public feed), CMHC's own newsroom (email only; its canada.ca releases arrive through the Government of Canada source), Ontario Newsroom (JavaScript-only page, no confirmed feed).

How it works:
- Feeds refresh when the page is opened and the last check is older than 30 minutes, or with "Refresh now". A source that fails keeps its earlier stories and shows its error on its card.
- Location (Toronto & GTA, Ontario, Canada) and topic are keyword tags from the story's own text, labelled as automatic in the app.
- The same story from two sources within 3 days is grouped under the primary official source.
- Arabic title and summary are written by Claude from the source text only, on request, and cached in `data/news.json`.
- Selected stories are saved per user for the later analysis and content steps.

Stories are stored in `data/news.json` (not committed). The machine running the app needs normal internet access to the Canadian sites.

## Structure

- `lib/i18n.ts`: interface strings, Arabic first, English optional
- `lib/db.ts`: local data store (to be replaced by Supabase)
- `lib/sample.ts`: dashboard sample content until the dashboard reads from the news store
- `lib/news/`: feed sources, tagging and duplicate detection, store, Arabic translation
- `components/ui.tsx`: shared UI, including `Bidi` for numbers inside Arabic text
- `app/globals.css`: design tokens copied from the Figma variables
