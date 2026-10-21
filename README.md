# Baha Content Studio

A private, Arabic-first real estate content studio for Baha Al-Sharif and his content manager. The interface is Arabic (RTL) by default, with English as an optional interface language. The language of generated content (Arabic, English or both) is a separate setting.

Design source: [approved Figma design](https://www.figma.com/design/FME8x2ZiMNPcsoTl9J3EE3?node-id=26-10), page "02 · Light Mode — All screens".

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # news, analysis, studio, library, session, storage, sources and sign-in checks
npm run typecheck  # TypeScript check
npm run build && npm start   # production build, http://localhost:3000
npm run refresh    # refresh the news sources now (add -- --force to ignore the 30-minute interval)
```

AI is off by default and nothing paid is called. To turn it on later, create `.env.local` with `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY=...`, then restart. Without both, every page still works and AI features show as unavailable.

## Sign-in

A private platform for two accounts only (Amona and Baha). There is no sign-up and no roles; both accounts can do the same things.

Everything below goes in `.env.local` (never committed) or, when hosted, in the host's environment settings:

- `SESSION_SECRET`: signs the sign-in cookie, at least 32 characters. Generate one with
  `node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))" >> .env.local`.
  Changing it signs everyone out.
- `AUTH_HASH_AMONA`, `AUTH_HASH_BAHA`: one password per account, stored only as a scrypt hash. Create each with `npm run set-password -- amona` and `npm run set-password -- baha`; the password is typed without being shown and only the hash line is printed, to paste into `.env.local` by hand. Restart after changing them.

**Production (`npm start`) refuses to start** unless `SESSION_SECRET` and both hashes are set and valid; it lists the missing names (never values) and exits. There is no default password in production. `npm run build` does not need them.

**Development (`npm run dev`)**: an account with a hash must use its own password. An account without a hash can still use `LOCAL_PASSWORD` (or the old local default `studio`), a temporary and insecure shortcut so nobody is locked out while the hashes are being set up: the sign-in page shows a warning and the server prints one on every such sign-in. It is refused in production, and it is never a fallback for an account that has a hash (valid or not) or for a failed sign-in. Without `SESSION_SECRET`, development uses a temporary secret and signs everyone out on restart.

**Failed attempts**: 5 wrong passwords for one account within 15 minutes lock that account for 15 minutes, even with the right password. The count is kept on the server in `data/auth-state.json` (times only, no passwords or IP addresses), so a lock survives a restart. If that file is damaged, sign-in stays closed rather than allowing unlimited attempts; deleting `data/auth-state.json` resets all locks. Anyone who can reach the sign-in page and knows an account name can trigger the 15-minute lock; that is accepted for a private two-person app.

Account settings are stored in `data/db.json`, created on first run.

## Data, backups and restore

All data lives in `data/` as JSON files, ignored by Git along with every `.env` file:

| File | Holds |
| --- | --- |
| `db.json` | the two accounts and their settings |
| `news.json` | stories, source status, Arabic translations, each user's selected stories |
| `drafts.json` | archived content studio drafts |
| `source-runs.json` | the last 50 refresh runs per source |
| `auth-state.json` | failed sign-in attempts |
| `backups/` | automatic daily copies |

Every write goes through `lib/storage/json-file.ts`: it applies the change to the newest copy of the file under a lock shared by the app and `npm run refresh`, writes to a temporary file and renames it, and never writes over a file it cannot parse (it stops with an error instead). Before the first change of each day, the file is copied to `data/backups/<name>-<date>.json`; the newest 14 per file are kept. A news refresh fetches first and then merges only stories and source status into the newest file, so a selection or translation saved meanwhile is kept.

Restore (stop the app first):

```bash
npm run restore-backup -- data/backups/news-2026-10-21.json          # check only
npm run restore-backup -- data/backups/news-2026-10-21.json --yes    # restore
npm run restore-backup -- "C:\path\to\backups\data-2026-10-21_114821" --yes   # a backup folder with MANIFEST.txt
```

Each file must be valid JSON and, for a backup folder with `MANIFEST.txt`, match its SHA-256. The files being replaced are copied to `data/backups/pre-restore-<time>/` first.

Backups inside `data/` live on the same disk as the data. Keep regular copies elsewhere too.

## Storage and hosting

The JSON files need a disk that survives restarts and new deployments. Locally that is the project folder. When hosting later:

- On an always-on server (a VPS or a machine at home), keep `data/` on a persistent disk or volume, back it up off the machine, and schedule `npm run refresh` with cron or Task Scheduler.
- On Vercel, other serverless platforms or containers without a mounted volume, local files are lost on every deployment or restart (and are often read-only). There, `data/` must not be used; the repositories in `lib/storage/repositories.ts` would be replaced by an external database (Postgres, Supabase or a hosted SQLite such as Turso) and refresh scheduled by the platform's cron. That choice is left until hosting is decided.
- In either case, `SESSION_SECRET` and the password hashes go in the host's environment settings, not in files in the repository.

## What is built

| Step | Status |
| --- | --- |
| 1. Foundation: RTL shell, Arabic/English interface, login, Settings, Dashboard | Done |
| 2. News monitor (official sources) | Done |
| 3. Market analysis + opportunities | Done |
| 4. Content creation studio (Reels + Carousels) | Done |
| 5. Content library, review workflow, real dashboard, exports | Done |
| 6. Publishing calendar | Planned |

The dashboard shows only saved drafts and stories collected by the news monitor; the sample figures from the design were removed in step 5.

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
- Arabic title and summary are written by Claude from the source text only, on request, when AI is turned on, and cached in `data/news.json`.
- Selected stories are saved per user for the later analysis and content steps.

Stories are stored in `data/news.json` (not committed). The machine running the app needs normal internet access to the Canadian sites.

## Market analysis and content opportunities (step 3)

Both pages read the stories already collected by the news monitor. Nothing is fetched or invented here, and duplicates are left out.

- **Scores** (`lib/analysis/score.ts`): two rule-based scores from 0 to 100. Relevance comes from keyword signals in the story text (prices and sales, Bank of Canada decisions, mortgages, first-time buyers, policy and taxes, supply, rentals; general economic news is down-weighted), location, source and age. Opportunity weights relevance 35%, usual audience interest 25%, recency 20% and client potential 20%. Every point is listed with its reason in Arabic and English, and the app labels the scores as automatic estimates, not AI and not a performance prediction.
- **Market Analysis** (`/analysis`): ranked stories, then per story the verified source, key figures quoted word for word from the source, general audience rules (labelled as general, no forecasts or good/bad direction), limitations, a glossary, and the AI tasks shown as unavailable.
- **Content Opportunities** (`/opportunities`): Reel and carousel angles from fixed rules per news category (`lib/opportunities/angles.ts`), with goal and audiences. Filters: audience (first-time buyers, sellers, homeowners, investors, Arab audiences, English-speaking Canadians), format, and content language (Arabic, English or both, defaulting to the user's setting).
- **AI layer** (`lib/ai/`): one interface for translation, market impact, Arabic explanations, Reel scripts, carousels, hooks and marketing copy. Only translation is implemented; the rest are declared for later. Pages never call a provider directly.

## Content creation studio (step 4)

`/studio` turns a real collected story into a Reel or carousel draft. `/reels` and `/carousel` open the same studio with the format chosen.

- **Workflow**: pick a story (ranked, with stories selected in the news monitor first) → choose format, Reel length (30, 45 or 60 seconds) or slide count (5 to 10, default 7), audience and content language → generate → edit, review and copy or export. "Write the draft" on Content Opportunities and Market Analysis opens the studio with the story, angle, format and language already set.
- **Generator** (`lib/studio/generate.ts`): fixed templates and rules, not AI. Arabic and English are written from separate templates, not translated. Figures are only ever quoted from the story's own sentences; when a story has no figures the draft stays general and points to the official link. Every draft keeps the source, publication date and link, and a "not financial or legal advice" line. Arabic drafts made from an untranslated story quote the figures and leave a review note with the original sentence so the reviewer writes what each figure measures.
- **Editor** (`/studio/[id]`): edit title, hook, script segments (voiceover, on-screen text, shot), slides, caption, CTA and hashtags; template alternatives for title and hook; copy one part or everything (review notes are left out of copies); export `.md` or `.txt`; regenerate; delete with confirmation; statuses draft, in review, ready to publish. There is no publish button. The original story is shown separately, with a warning when it is older than 14 days.
- **Storage**: drafts are saved in `data/drafts.json` on the machine running the app (not committed). They survive a refresh and restart, but they are not synced between devices. Each draft keeps a short change log (who changed what and when), not earlier versions of the text; back the file up if needed. It will move to the shared database later with the rest of `lib/db.ts`.
- **AI**: the studio checks `lib/ai/` for the `reelScript` task. Those AI tasks are declared but not implemented, so the studio says every draft is template-generated and needs human review. Adding AI writing later means implementing those tasks there; no page calls a provider directly.

## Content library and workflow (step 5)

- **Library** (`/library`): every saved draft with its title, original story, format, language, creation date, status, source link and a short preview. Search covers titles, all draft text and the original story, and ignores Arabic diacritics and hamza forms. Filters: format, language, status and a creation date range (Toronto dates). Filters stay in the address bar. Each card opens the draft, makes an independent copy, changes its status, or deletes it after a confirmation. The top bar search opens the library. `/studio` now redirects here.
- **Workflow**: Draft → In review → Needs changes → Approved → Ready to export. The status changes only when the user picks one, is saved straight away, and Approved asks for confirmation first. Changing status with unsaved edits asks to save both together. Nothing is ever published. Drafts saved in step 4 as "ready to publish" open as "ready to export".
- **Draft page** (`/studio/[id]`): workflow stepper, details (format, language, audience, status, created, last edited), the original story, and a short change log (last 30 entries, kept in the draft). It warns before leaving with unsaved edits, including in-app links.
- **Dashboard** (`/`): counts per status computed from the same drafts as the library, recent drafts, the best opportunity and the latest stories from the news monitor. The sidebar shows how many drafts are ready to export.
- **Exports**: Markdown, plain text (UTF-8 with a byte-order mark so Windows editors show Arabic correctly) and JSON. Each includes title, full text, format, language, review status, creation date, original story title, source link and story date. JSON keeps the content exactly as stored.
- **Older and damaged data** (`lib/studio/normalize.ts`): drafts are read through a normaliser that fills safe defaults for missing fields and never promotes a status. A record without a source link or content is counted as unreadable and left in the file untouched. If `data/drafts.json` itself can't be parsed, nothing is written to it.

## Structure

- `lib/i18n.ts`: interface strings, Arabic first, English optional
- `lib/db.ts`: local data store (to be replaced by Supabase)
- `lib/news/`: feed sources, tagging, filters and duplicate detection, store
- `lib/analysis/`, `lib/opportunities/`: scoring, audience rules and content angles
- `lib/studio/`: draft types, template generator, normaliser for stored drafts, library search and counts, copy/export text, draft store and server actions
- `lib/ai/`: AI provider interface (off by default)
- `tests/`: `npm test` runs feed parsing, scoring, classification, filtering, duplicate, studio generator and library/workflow/export checks
- `components/ui.tsx`: shared UI, including `Bidi` for numbers inside Arabic text
- `app/globals.css`: design tokens copied from the Figma variables
