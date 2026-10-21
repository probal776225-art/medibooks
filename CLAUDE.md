# Pharmacy Baki Khata — Project Guide for Claude

## What this is
An offline-first PWA for **M/S ALLOPATHIC STORE & SURGICAL** (R.K Mission Road, Sreemangal, 01711460114) to track customer dues (বাকি).
Single owner, non-commercial, used on PC + mobile. Main goal: never lose track of baki, and the customer gets an SMS on every baki/joma.

- **Design (source of truth): `docs/ARCHITECTURE.md`** — schema, offline strategy, medicine master-data, import pipeline, money rules, phases.
- Screens and behaviour: `docs/SPEC.md` — read the section for the current phase before coding.
- Build plan: `docs/PROMPTS.md` — one phase at a time.
- Architecture status: **approved 2026-10-22.** Phases 1–3 done (skeleton + domain core; Firebase, login, customers; medicine master + offline search); next is Phase 4.
- `~/Claude/MedEx_Medicine_Directory.xlsx` (owner-supplied, 26,506 brands, no prices): owner confirmed MedEx's written permission on 2026-10-22; it is imported through Settings → ইমপোর্ট as the reference list — see ARCHITECTURE §0 and §3. Never copy this file into the repo or `web/public`.

## Tech stack (do not change without asking)
| Area | Choice |
|---|---|
| App (`web/`) | Vite + React 18 + TypeScript (strict) + Tailwind CSS + React Router |
| State | Zustand; Firestore listeners feed the stores |
| Data + sync | Firebase Firestore, modular web SDK v10+, `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` |
| Local store | Dexie (IndexedDB): medicine mirror, import staging, drafts, usage counts |
| Auth | Firebase Auth, email/password, single owner |
| PWA | vite-plugin-pwa (precache app shell + fonts; "new version" reload prompt) |
| Medicine search | MiniSearch (prefix + fuzzy) built from the Dexie `medicines` table |
| PNG export | html-to-image (NOT html2canvas — it breaks Bangla conjuncts) |
| CSV import | PapaParse (UTF-8) |
| Font | @fontsource/hind-siliguri (bundled, works offline) |
| Dates | dayjs + utc + timezone plugins, always `Asia/Dhaka` |
| Tests | Vitest (unit), @firebase/rules-unit-testing on the emulator (rules) |
| Server (`worker/`) | Cloudflare Worker (TypeScript, wrangler), `jose` for JWT. SMS, reminder cron, later customer portal API |
| Hosting | Firebase Hosting (Spark free plan) |

Ask before adding any dependency not in this table.

## Folder layout
See `docs/ARCHITECTURE.md` §2. Short version:
```
web/src/app/        shell, routes
web/src/domain/     PURE logic (money, billing, pricing, ledger, phone, sms, dates, ids, types) — no React/Firebase imports
web/src/data/       firebase.ts, paths.ts, localdb.ts (Dexie), repos/
web/src/catalog/    medicine sync, search, import/ (pipeline + adapters)
web/src/features/   screens
worker/             Cloudflare Worker
data/imports/       owner's import files (gitignored)
```

## Non-negotiable rules
1. **Money is integer paisa everywhere** (৳1 = 100). No floats in storage or math. Percent discounts in basis points. Format only at display. Helpers in `web/src/domain/money.ts`, fully unit-tested.
2. **Customer doc id = normalized mobile** `01XXXXXXXXX` → `shops/main/customers/{mobile}`. Natural de-duplication, works offline.
3. **`totalDuePaisa` changes ONLY via `increment()`**, in the same `writeBatch` as the transaction that causes it. Never `set()`/overwrite it. Customer create/update uses `set(data, { merge: true })` WITHOUT that field.
4. **Transactions are append-only.** Never deleted, amounts never edited. Correction = void (`voided: true` + reverse `increment()` in the same batch) + an `auditLog` entry.
5. **Sale lines are snapshots.** Each line copies name, generic, strength, form, manufacturer, unit, pieces per unit, qty, list price, charged unit price, discount and line total at sale time. Never recompute or re-read old transactions from `medicines`.
6. **Medicine master never overwrites history or the owner.** Imports update only `source*` fields; `shop*` price overrides and `status` are owner-only. Nothing in `medicines` is ever deleted (deactivate instead).
7. **No live medicine-source calls.** The sale screen reads only the local medicine store. The app must work fully when MedEx or any source is unavailable.
8. **MedEx: no scraping.** Its Terms of Use forbid automated extraction without written consent. Do not write crawlers, do not call MedEx's private app endpoints, do not parse MedEx pages automatically. The only MedEx data used is the owner-supplied `.xlsx` (owner confirmed MedEx's written permission on 2026-10-22), imported as the reference list. No Kaggle data.
9. **Offline first.** Every write must work offline. Do NOT `await batch.commit()` in UI flows (it only resolves on server ack and hangs offline). Commit fire-and-forget with `.catch()` → toast. Show a pending-sync count in the header.
10. **Free-tier budget** (Firestore Spark: 50k reads / 20k writes per day). Realtime-listen only to `customers` + `settings`. Transactions on demand with pagination. Medicines via delta sync (`updatedAt > cursor`). Only medicines the shop sells go into `medicines`; a large reference list is stored as a few packed chunk docs (`refCatalog`), never one doc per row, and searched from Dexie.
11. **SMS only from the Worker.** The browser never holds the SMS API key. App writes an `smsQueue` doc in the same batch → calls the Worker → Worker claims with an `updateTime` precondition (never double-send).
12. **Timezone `Asia/Dhaka`** for "today", reports, memo dates and the reminder schedule.
13. **UI language Bangla by default**, English toggle. Every UI string goes through i18n (`bn.ts`, `en.ts`). Medicine names stay in English.
14. **Phone:** accept `01XXXXXXXXX`, `+8801…`, `8801…`, spaces/dashes; validate `/^01[3-9]\d{8}$/`; store `01XXXXXXXXX`. Convert to the provider's format only inside the Worker adapter.
15. **Secrets never committed.** `web/.env.local` for Firebase web config; Worker secrets via `wrangler secret put`. `.gitignore` covers `data/imports/`, `.env*`, `*service-account*.json`, `.wrangler/`.
16. When an external API or file format is unclear (SMS provider, any medicine export), ask for its docs or a real sample instead of guessing.

## Data model
Full schema in `docs/ARCHITECTURE.md` §3 (Firestore under `shops/main/`, Dexie device-local tables). Every Firestore doc carries `schemaVersion`, `createdAt`, `createdBy`.

**Rules:** only the owner UID (hard-coded in rules for v1) can read/write `shops/main/**`; `auditLog` and `medicinePriceHistory` create-only; `transactions` no delete and no change to amount fields; `medicines` no delete. The Worker uses a service account (bypasses rules).

## Commands
```
# project root (Firebase CLI is a root devDependency; Java 21 from Homebrew openjdk@21 is put on PATH by the scripts)
npm run emulators                   # auth + firestore emulators, project demo-baki, data kept in .emulator-data/
npm run seed                        # (emulators running) wipe + seed test owner and 30 customers; prints the test login
npm run test:rules                  # security rules tests on a throwaway emulator
# web/
npm run dev | build | test | lint   # web/.env.local points the app at the emulator
cd worker && npx wrangler dev | deploy
npx firebase deploy --only hosting,firestore:rules,firestore:indexes
```
During development use the Firebase emulator (`demo-baki` project, no real Firebase needed), not the real project, to protect the free quota. Restarting the auth emulator invalidates old sign-ins (TOKEN_EXPIRED) — just sign in again.

## Working style
- One phase at a time (`docs/PROMPTS.md`). Plan first → implement → run tests + `npm run build` → summarize what changed and give a short manual test checklist.
- Mobile-first: tap targets ≥ 44px, big readable numbers, works on low-end Android Chrome. PC gets keyboard shortcuts.
- Keep components small; business logic in `domain/` and repositories, not in components.
- Never break existing data shape without a migration note (bump `schemaVersion`).
- The owner is not a developer: explain in simple Banglish with exact click steps when they must do something.
