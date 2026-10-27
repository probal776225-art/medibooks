# MediBooks

কাস্টমারের বাকি ও জমার হিসাব — an offline-first app for customer dues (বাকি) at **M/S ALLOPATHIC STORE & SURGICAL**, Sreemangal.

Live: **https://msallopathic.store**

## What it does

- Customers by mobile number: due bills (বাকি), payments (জমা), ledger, statement and memo images to share
- Works without internet: bills and payments save on the device and sync when it is back
- SMS to the customer after a bill or payment, and automatic due reminders (তাগাদা), through a small Cloudflare Worker
- Medicine list with same-generic alternatives, prescription photos, staff accounts, reports, PIN lock, backup and restore
- Bangla and English

## Stack

- `web/` — Vite + React 18 + TypeScript (strict) + Tailwind, installed as a PWA; Firebase Auth + Firestore (offline cache), Dexie
- `worker/` — Cloudflare Worker (TypeScript) that sends the SMS queue and runs the daily reminders
- `firestore.rules` — who may read and write what (the owner, active staff)
- `docs/` — `SPEC.md` (screens and behaviour), `ARCHITECTURE.md` (design), `RUNBOOK.md` (owner's guide, Banglish), `QA.md`

## Run it locally

Needs Node 20+, the Firebase CLI and Java 21 (for the emulators). Nothing real is touched: it uses the emulator project `demo-baki` and a fake SMS provider.

```bash
npm install --prefix web && npm install --prefix worker
cp web/.env.example web/.env.local   # then fill in the emulator values shown in the file
npm run emulators                    # terminal 1: Auth + Firestore emulators
npm run seed                         # once: test owner and staff logins
npm --prefix web run dev             # terminal 2: the app on http://localhost:5173
```

Tests: `npm --prefix web test` (unit), `npm run test:rules` (security rules), `npm --prefix worker test` (SMS Worker).

## Deploying

`npm run deploy` (app, rules, indexes) and `npm run deploy:worker` read the real settings from `web/.env.deploy.local`, which is never committed. API keys and the Firebase service account live only as Worker secrets (`wrangler secret put`). Details: `docs/RUNBOOK.md` §10 and §13.
