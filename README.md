# Baha Content Studio

A private, Arabic-first real estate content studio for Baha Al-Sharif and his content manager. The interface is Arabic (RTL) by default, with English as an optional interface language. The language of generated content (Arabic, English or both) is a separate setting.

Design source: [approved Figma design](https://www.figma.com/design/FME8x2ZiMNPcsoTl9J3EE3?node-id=26-10), page "02 · Light Mode — All screens".

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in with either account. Version 1 uses one temporary local password, `studio` (override it with `LOCAL_PASSWORD`). Account settings are stored in `data/db.json`, which is created on first run and not committed.

## What is built

| Step | Status |
| --- | --- |
| 1. Foundation: RTL shell, Arabic/English interface, login, Settings, Dashboard | Done |
| 2. News monitor (official sources) | Next |
| 3. Market analysis + opportunities | Planned |
| 4. Reels + Carousel studios | Planned |
| 5. Library + calendar | Planned |

Figures and headlines on the dashboard are sample content from the design and are labelled as such in the app.

## Structure

- `lib/i18n.ts`: interface strings, Arabic first, English optional
- `lib/db.ts`: local data store (to be replaced by Supabase)
- `lib/sample.ts`: sample content until the official sources are connected
- `components/ui.tsx`: shared UI, including `Bidi` for numbers inside Arabic text
- `app/globals.css`: design tokens copied from the Figma variables
