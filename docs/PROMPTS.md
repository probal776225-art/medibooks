# Claude Code Build Plan — MediBooks (was Pharmacy Baki Khata)

## Kivabe use korba (porte 2 minute)
1. Prottek phase er prompt **copy → Claude Code e paste**. Ekbare ekta phase.
2. Prompt dewar age **Shift+Tab** chepe **Plan mode** on koro. Claude plan dekhabe → valo laagle approve → tarpor code korbe.
3. Phase shesh hole: nije test koro (prompt er "Done when" list) → `git add . && git commit -m "phase N"`.
4. Next phase er age **`/clear`** dao (context fresh thakbe; CLAUDE.md auto load hoy, tai project bhulbe na).
5. Error ashle: puro error text paste kore likho `Fix this error:`.
6. **API key / password kokhono chat e paste korbe na.** Nije `.env.local` file e boshaba ba `wrangler secret put` diye dibe.

---

## Phase 0 — Setup (tumi nije korba, ~45 min)

> ⚠️ Phase 1 shuru korar age `docs/ARCHITECTURE.md` approve korte hobe.

**Mac e install**
```bash
brew install node            # Node.js LTS (20 or 22)
brew install openjdk@21      # Firebase emulator er jonno Java lage; brew je symlink command dekhabe seta run koro
npm install -g firebase-tools
firebase login
```
Claude Code already installed thakte hobe.

**Project folder** — already ready: `~/Claude/pharmacy-baki` (docs + git init kora ache).

**Medicine data** — kono download lagbe na. Kaggle use hobe na.
- Dokaner nijer ওষুধ list app e dhire dhire add hobe (bikrir somoy quick add), ba supplier er price list CSV kore import.
- MedEx theke file import shudhu MedEx er written permission pele (`docs/ARCHITECTURE.md` §0).

**Firebase (free Spark plan, card lagbe na)**
1. console.firebase.google.com → Add project → nam: `pharmacy-baki` (Analytics off)
2. Build → **Firestore Database** → Create → Production mode → location **asia-south1 (Mumbai)**. ⚠️ Location pore change kora jay na.
3. Build → **Authentication** → Email/Password enable → Users → Add user (tomar email + strong password)
4. Users list theke oi user er **UID** copy kore rakho (Phase 2 e lagbe)
5. Project settings → Your apps → **Web app** add (Hosting tick dao) → config ta rakho (Phase 2 e `.env.local` e boshabe)

**Cloudflare (Phase 7 er age)** — dash.cloudflare.com e free account → terminal e `npx wrangler login`

**SMS provider (Phase 7 er age)** — account khulo, kichu recharge koro. Provider select korar age confirm koro:
- [ ] Bangla (Unicode) SMS support ache
- [ ] HTTP API + API doc ache
- [ ] **IP whitelist mandatory na** (Cloudflare Worker er IP fixed na — whitelist lagle SMS reject hobe)
- [ ] Balance check API thakle bhalo
- [ ] Non-masking diye start (masking e document + boro recharge lage)

---

## Phase 1 — Project skeleton, PWA, i18n, domain core
```
Read CLAUDE.md, docs/ARCHITECTURE.md (§1, §2, §5, §7) and docs/SPEC.md sections 1 and 12.

Phase 1: scaffold the project. No Firebase yet.
1. Create web/ with Vite + React 18 + TypeScript (strict) + Tailwind + React Router + Zustand + vite-plugin-pwa + @fontsource/hind-siliguri + dayjs (utc, timezone). Folder layout exactly as ARCHITECTURE §2.
2. Root .gitignore per CLAUDE.md rule 15.
3. App shell per SPEC section 1: mobile bottom nav with center FAB, PC sidebar (breakpoint md), header with online/offline dot and a placeholder pending-sync badge, language toggle. Empty placeholder pages for every route.
4. i18n: web/src/i18n/bn.ts (default) and en.ts, a tiny typed t() helper + hook, persisted choice. Bangla digits helper for display.
5. web/src/domain (pure, no React/Firebase imports):
   - types.ts: entity types from ARCHITECTURE §3 (Customer, Transaction, SaleLine, Medicine, SourceRecord, ...)
   - money.ts: parse user input ("1,250.50", Bangla digits) → paisa, format paisa → "৳1,250.50" (bn/en digits), percent in basis points with round-half-up, round-to-taka returning roundOff
   - pricing.ts: sellable units for a medicine (piece/strip/pack/custom), effective unit price (shop override → source → derived), build a SaleLine snapshot
   - billing.ts: buildSale(), buildPayment(), buildOpening(), buildVoid() → transaction doc + effectPaisa, per ARCHITECTURE §7
   - ledger.ts: running balance, balance check (sum of non-voided effects)
   - phone.ts, sms.ts (segment counter GSM-7 160/153, Unicode 70/67 + template renderer), dates.ts (Asia/Dhaka), ids.ts (memoNo 'B-YYMMDD-XXXX', deviceId)
6. Vitest unit tests for every domain file, including edge cases (Bangla digits, +880 numbers, 12.5% discount, rounding, line + bill discount together, paid-now = net, snapshot unaffected by later medicine price change).
7. PWA: installable manifest (name "বাকি খাতা", short name, theme color, simple placeholder icons), precache app shell + fonts, "নতুন ভার্সন এসেছে" reload prompt.

Done when: npm run test passes, npm run build passes, app installs from Chrome on localhost, layout looks right at 360px and 1366px widths.
```

## Phase 2 — Firebase, login, customers
```
Read CLAUDE.md (rules 2, 3, 9, 10), docs/ARCHITECTURE.md §3 and §4, and docs/SPEC.md sections 2 and 3.

Phase 2: Firebase foundation + customers.
1. firebase.json, .firebaserc, firestore.rules, firestore.indexes.json. Rules per CLAUDE.md; owner UID placeholder "REPLACE_WITH_OWNER_UID" (I will paste my UID). Rules tests with @firebase/rules-unit-testing: owner can read/write, others cannot, auditLog + medicinePriceHistory create-only, transactions cannot be deleted or have amount fields changed, medicines cannot be deleted.
2. web/src/data/firebase.ts: init from VITE_ env vars, persistentLocalCache + persistentMultipleTabManager, connect to emulators when VITE_USE_EMULATOR=true. data/paths.ts with every path. Create web/.env.example listing all vars (I will fill .env.local myself).
3. Login screen (email/password), stays logged in offline, logout in settings.
4. Settings doc bootstrap: if shops/main/settings/general does not exist, create it with defaults from SPEC 8, 9, 12 (shop: M/S ALLOPATHIC STORE & SURGICAL, R.K Mission Road, Sreemangal, 01711460114; smsShortName অ্যালোপ্যাথিক স্টোর; sms.testMode true).
5. Repositories + Zustand stores: realtime listener on customers (non-archived) and settings only. Pending-writes counter wired to the header badge.
6. Customer features from SPEC 3: mobile lookup card, new-customer inline form, list with search/sort/filters, aging badge, detail page skeleton (ledger comes in Phase 5), SMS/Reminder toggles, edit name/address.
7. Seed script for the emulator with ~30 fake customers.

Done when: rules tests pass; on the emulator I can log in, add customers, look up by mobile instantly, and in airplane mode adding/editing still works and syncs when back online.
```

## Phase 3 — Medicine master + offline search
```
Read CLAUDE.md (rules 5–8, 10), docs/ARCHITECTURE.md §3, §4, §5 and docs/SPEC.md sections 4A and 13.

Phase 3: the shop's own medicine list. No MedEx access of any kind.
1. Add Dexie (approved in CLAUDE.md). web/src/data/localdb.ts with the tables in ARCHITECTURE §3.2 and a versioned schema.
2. repos/medicines.ts: create / update / deactivate in Firestore (never delete), and write the same change to Dexie immediately. Shop price overrides append medicinePriceHistory in the same batch.
3. catalog/sync.ts: Firestore → Dexie delta sync by updatedAt > cursor (on app start, on reconnect, after edits on another device). Paginate 500 per page.
4. catalog/search.ts: MiniSearch over Dexie medicines (brand prefix weighted highest, then generic, then manufacturer; fuzzy 0.2), local usage ranking. Build off the main thread if it takes > 150 ms on a throttled CPU.
5. Reusable <MedicineSearch> component: keyboard (↑ ↓ Enter) + touch friendly, result line format from SPEC 4A.
6. Medicines screen (Settings → ওষুধ): list, search, add, edit, deactivate, price history, "MedEx e dekho" button that opens the saved sourceUrl in a new tab.
7. Quick-add dialog reused later by the sale screen.
8. Seed script for the emulator with ~200 sample medicines typed by hand in the script (no external data).

Done when: searching "napa", "para", "omep", "seclo" on seed data returns results in < 100 ms; works in airplane mode; adding a medicine on one device shows on the other after sync; unit tests for the sync cursor logic pass.
```

## Phase 4 — New Baki / Sale (main screen)
```
Read CLAUDE.md (rules 1, 3, 4, 5, 9), docs/ARCHITECTURE.md §3 (SaleLine) and §7, and docs/SPEC.md section 4.

Phase 4: the New Baki flow exactly as SPEC 4.
1. Step 1 customer (reuse Phase 2 lookup). Step 2 mode toggle: ওষুধ দিয়ে / সরাসরি টাকা.
2. Item rows: unit toggle piece / strip / box / custom (from domain/pricing.ts), qty stepper, editable price (marks priceOverridden; "এই দাম সেভ করবেন?" → shop override via repos/medicines), optional line discount, quick-add medicine.
3. Bill summary: subtotal, bill discount (none / % / ৳), round-off, net, optional paid-now + method, এই বিলে বাকি, আগের বাকি, মোট বাকি. All math via domain/billing.ts.
4. Save in ONE writeBatch: customer merge-set (no totalDuePaisa), transaction (type 'sale', full line snapshots), increment(totalDuePaisa), lastTxnAt. Fire-and-forget commit. Leave a clear TODO hook where the smsQueue item will be added in Phase 7.
5. After-save sheet (PNG button disabled until Phase 10), "আরেকটি বাকি". Unsaved bill kept as a Dexie draft.
6. PC shortcuts from SPEC 1. Large tap targets on mobile.

Done when: unit tests pass; a 5-item bill (piece + strip + box + custom, one edited price, one line discount) with 10% bill discount + paid-now gives correct totals; changing that medicine's price afterwards does not change the saved bill; due updates instantly, also offline.
```

## Phase 5 — Payment, ledger, void, audit, repair
```
Read CLAUDE.md and docs/SPEC.md sections 3 (customer detail), 5 and 6.

Phase 5:
1. Payment screen per SPEC 5 (methods Cash/Card/bKash/Nagad, TrxID, advance confirm) using domain/billing.ts buildPayment().
2. Customer ledger: paginated transactions query (customerId + createdAt desc, 30 per page), running balance from domain/ledger.ts, voided rows struck through.
3. Void: reason required, one batch (voided fields + reverse increment + auditLog). Cannot void twice.
4. auditLog writes for create customer, edit customer, void, settings change, medicine edits.
5. Settings → ব্যালেন্স যাচাই repair tool per SPEC 6.

Done when: payment and void update the due correctly online and offline; repair tool finds and fixes a deliberately broken total on the emulator.
```

## Phase 6 — Imports (opening balances + medicine files) + change mobile
```
Read CLAUDE.md (rules 6, 8, 16), docs/ARCHITECTURE.md §6 and docs/SPEC.md sections 3 (change mobile), 7 and 13.

Phase 6:
1. Opening balances: CSV template download (UTF-8 with BOM so Excel shows Bangla), upload with PapaParse → preview with validation per SPEC 7, quick grid with Enter-to-next-cell and Dexie draft autosave, import in batches of ≤ 400 ops with progress bar, type 'opening', SMS OFF by default.
2. Medicine import pipeline in web/src/catalog/import: SourceAdapter/SourceRecord types, normalize, validate, match, diff, apply — exactly as ARCHITECTURE §6. Staging rows in Dexie. Unit tests for normalize (pack text like "2 x 10", "10's", "100 ml"), match and diff, and idempotency (same file twice = 0 changes).
3. adapters/csv.ts for the template in SPEC 13 + template download.
4. Review screen: new / changed (old → new) / unchanged / missing / errors, row tick boxes, apply with progress; writes medicineImports summary + price history + audit log. Never touches shop overrides, status or transactions.
5. adapters/medex.ts: ONLY if I have given you a licensed MedEx sample file. Otherwise leave the stub that says "needs a licensed sample". Do not fetch anything from medex.com.bd.
6. Change mobile number feature per SPEC 3 with audit log.

Done when: a 50-row opening CSV with Bangla names imports correctly; a 100-row medicine CSV imports, re-importing it shows 0 changes, and a price change in the file shows as old → new without touching my manual overrides.
```

## Phase 7 — SMS (Worker + queue + templates + log)
Age SMS provider er API doc er link/text ready rakho.
```
Read CLAUDE.md (rule 11) and docs/SPEC.md section 8.

Phase 7: SMS end to end.
1. worker/: Cloudflare Worker (TypeScript, wrangler). Endpoints:
   - POST /sms/process { queueIds?: string[] } — requires Authorization: Bearer <Firebase ID token>; verify with jose against Google's securetoken JWKS (issuer https://securetoken.google.com/<projectId>, audience <projectId>), uid must be in ALLOWED_UIDS.
   - GET /sms/balance (if the provider supports it).
   - CORS for localhost + the Firebase Hosting domain.
   Firestore access via REST using a service account (secret SERVICE_ACCOUNT_JSON): RS256 JWT → OAuth token (scope datastore), cache the token in memory.
   Claim each queue item by PATCHing status 'sending' with a currentDocument.updateTime precondition; skip if the precondition fails. Then send, then set sent/failed + providerRef/lastError, attempts++.
   If settings.sms.testMode → do not call the provider, set status 'test'.
2. SMS provider adapter interface { send(to, message, unicode), balance?() } in worker/src/providers/. I will paste my provider's API docs — implement that adapter. Ask me if anything is unclear; do not guess parameters.
3. Cron trigger every 10 minutes: sweep 'pending' items older than 2 minutes and 'failed' items with attempts < 3 (with backoff). (Reminders come in Phase 8 — leave a hook.)
4. App side: add smsQueue items in the same batch as sale/payment/opening (respect settings.sms.enabled and customer.smsEnabled; pick paymentClear when new total ≤ 0). After commit, if online call /sms/process; when coming back online, process synced pending items.
5. Settings → SMS template editor per SPEC 8 (variable chips, live preview, char + segment count, cost estimate, reset, test send to my number).
6. SMS Log page per SPEC 8.
7. Tell me exactly which `wrangler secret put` commands to run and which VITE_WORKER_URL to set. Do not ask me to paste secrets into the chat.

Done when: in test mode every baki/payment creates exactly one log entry with status "টেস্ট"; after I switch test mode off, a real Bangla SMS arrives once (no duplicates) even if I save while offline and reconnect.
```

## Phase 8 — Auto reminder + তাগাদা page
```
Read CLAUDE.md and docs/SPEC.md section 9.

Phase 8:
1. Shared eligibility function (same logic in app and Worker; keep a copy in worker with identical tests).
2. Worker cron: once per day when Asia/Dhaka hour == settings.reminder.sendHour, guarded by settings.reminder.lastRunDate. Query customers with totalDuePaisa >= threshold, apply all rules, create smsQueue items (kind reminder), send, update lastReminderAt / reminderMonth / reminderCountThisMonth.
3. তাগাদা page: today's eligible list, single send, bulk send with count + cost confirm, call button.
4. Settings → রিমাইন্ডার form for all rules (intervalDays default 2).

Done when: unit tests cover every rule; on a test run a ৳6,000 customer gets one reminder, does not get another before intervalDays, and a toggled-off or recently-paid customer gets none.
```

## Phase 9 — Dashboard + Reports
```
Read CLAUDE.md (rule 10) and docs/SPEC.md sections 2 and 10.

Phase 9:
1. Dashboard cards + today's last 10 transactions (one date-range query, Asia/Dhaka today).
2. Reports page: date presets + custom range, all metrics in SPEC 10 (payments by method must include paid-now from baki bills), aging buckets from customers in memory, top 10, SMS count + cost.
3. CSV export of the report.
4. Keep reads low: one transactions query per range, no per-customer fan-out.

Done when: numbers match a hand calculation on emulator seed data.
```

## Phase 10 — PNG memo, statement, report + share
```
Read CLAUDE.md and docs/SPEC.md section 11.

Phase 10:
1. Hidden render templates (576px wide) for baki memo, payment receipt, customer statement (date range picker), report summary.
2. html-to-image toPng at pixelRatio 2 after document.fonts.ready; white background.
3. Share via navigator.share({ files }) when canShare, else download; filenames per SPEC 11.
4. Enable the PNG button on the after-save sheet and add buttons on customer detail and reports.

Done when: Bangla conjuncts render correctly in the PNG, and sharing to WhatsApp works on Android Chrome.
```

## Phase 11 — PIN lock, backup, final settings
```
Read CLAUDE.md and docs/SPEC.md section 12.

Phase 11:
1. PIN lock (4–6 digits, PBKDF2 via WebCrypto, per device, lock on open + after N idle minutes, forgot PIN = log out and log in again).
2. Backup: export all shop data to JSON + customers CSV; restore from JSON with typed confirmation; weekly export reminder banner.
3. Remaining settings: shop info, rounding, digits, language, medicine overrides list (edit/delete override), custom medicines list.

Done when: lock/unlock works on both devices; export → restore on a fresh emulator gives identical totals.
```

## Phase 12 — QA + deploy
```
Read CLAUDE.md and docs/SPEC.md section 14.

Phase 12:
1. Walk through every item in the SPEC 14 checklist; write Playwright-free manual test notes plus any missing unit tests.
2. Lighthouse PWA + performance check on a throttled mobile profile; fix big issues.
3. Deploy: firestore rules + indexes, Firebase Hosting, Worker (wrangler deploy). Give me the exact commands and the final URL.
4. Write docs/RUNBOOK.md in simple Banglish: how to install on PC and phone, daily use, what to do if SMS fails, how to back up, how to check Firebase usage.

Done when: live URL works on my PC and phone, data syncs between them, and I have the runbook.
```

---

## Pilot er por (v2 ideas)
- Stock / inventory
- Multiple users (staff login, role)
- Thermal printer (PNG already 576px wide)
- Licensed MedEx file import (only with MedEx's written permission)
- Customer portal (ARCHITECTURE §9)

## Helpful prompts (jekono shomoy)
- `Something is wrong: <describe>. Find the cause before changing code, then explain the fix.`
- `Review the code from this phase against CLAUDE.md rules and list any violations.`
- `Firestore reads are high today. Find which screens read the most and reduce them.`
