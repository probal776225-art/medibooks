# Feature Spec — Pharmacy Baki Khata v1

Shop: **M/S ALLOPATHIC STORE & SURGICAL**, R.K Mission Road, Sreemangal, 01711460114
Users: 1 owner (pilot). Devices: PC (Chrome, installed as app) + Android phone (installed PWA).
Scope v1: baki + joma only. No stock, no printing (PNG only), no multi-user.

---

## 1. Navigation
- **Mobile:** bottom nav — হোম · কাস্টমার · (+) নতুন বাকি (center FAB) · তাগাদা · আরও
- **PC:** left sidebar with the same items + Reports, SMS Log, Settings
- **Header (always):** online/offline dot, "সিঙ্ক বাকি: N" when pending writes exist, language toggle
- **PC shortcuts:** `F2` নতুন বাকি · `F4` জমা নিন · `/` or `Ctrl+K` search · `Enter` add medicine row · `Ctrl+Enter` save · `Esc` close

## 2. Dashboard (হোম)
- Big search: "মোবাইল নম্বর বা নাম লিখুন" → instant results from the in-memory customer list
- Cards: বাজারে মোট বাকি (sum of totalDuePaisa > 0) · আজ বাকি দিলাম · আজ জমা পেলাম · আজকের তাগাদা (count)
- Quick buttons: নতুন বাকি · জমা নিন
- Last 10 transactions today

## 3. Customer
Fields: **Name, Mobile, Address** (+ optional note). Mobile is the unique key (one family can share one account; note can say who).

**Mobile lookup (core flow):** as soon as 11 valid digits are typed:
- Exists → customer card: name, address, **total due (big)**, aging badge, last payment date, last 5 transactions (expandable), SMS/Reminder toggles
- New → inline form (name required, address optional), saved together with the first transaction

**Customer list:** search; sort by due (desc, default), name, last activity, aging; filters: due > 0, due ≥ ৳5,000, SMS off, archived.
**Aging badge:** days since `lastPaymentAt` (or first baki if never paid): green < 30, yellow 30–60, red > 60.
**Customer detail:** buttons বাকি দিন · জমা নিন · স্টেটমেন্ট (PNG) · কল (`tel:`) · এখনই রিমাইন্ডার; per-customer **SMS on/off** and **Reminder on/off**; ledger with running balance (computed on display), void action, edit name/address, **change mobile** (moves the doc + updates its transactions in batches ≤ 450, audit logged).

## 4. New Baki (নতুন বাকি) — the most-used screen, must be fast
Step 1: mobile → customer card / new form (section 3).
Step 2: choose mode with a toggle:

**A. ওষুধ দিয়ে (items)**
- Search box over the shop's local medicine list (`medicines`, Dexie mirror): brand / generic / company, prefix + fuzzy, results < 100 ms, works offline. Frequently-sold medicines rank first (usage count kept locally). Never calls MedEx or any website.
- Result line: `Napa 500 mg Tablet · Paracetamol · Beximco · ৳1.20/পিস · ১০ পিস/স্ট্রিপ`
- Selecting adds a row: unit toggle **পিস / স্ট্রিপ / বক্স / কাস্টম** (strip only if `piecesPerStrip` is known, box only if `piecesPerPack` is known; custom = free label + price), qty stepper (positive integer), price (editable), optional line discount, line total.
- Unit price = shop override → source price for that unit → piece price × pieces per unit (ARCHITECTURE §5). If strip/pack size is unknown, ask once and save it on the medicine.
- If the price is edited → the line is marked `priceOverridden`; then "এই দাম সেভ করবেন?" → saves a shop price override on the medicine (synced, logged in price history). Old bills never change.
- "+ নতুন ওষুধ" quick-adds a medicine to the shop list (brand, generic, strength, form, company, price, strip/pack size, optional MedEx link) with `sourceName: 'manual'`.
- Every line is saved as a full snapshot (ARCHITECTURE §3 SaleLine).

**B. সরাসরি টাকা (amount)** — amount + note (e.g. "ওষুধ, ১৫ অক্টোবর").

**Bill summary (both modes):**
- Subtotal
- Discount on the **whole bill**: segmented `নেই | % | ৳` + value. Percent 0–100; flat ≤ subtotal.
- Round-off to whole taka if `billing.roundToTaka` (default on), shown as a line
- Net
- Optional **এখন জমা** (paid now) + method (Cash/Card/bKash/Nagad)
- এই বিলে বাকি = net − paid now
- আগের বাকি → **মোট বাকি** (after this bill)
- Note (optional)

**Save:** one `writeBatch`: customer merge-set (if new/changed), transaction doc (`type: 'sale'`), `totalDuePaisa: increment(effect)`, `lastTxnAt`, smsQueue doc (if SMS on). UI does not wait for the server.
**After save:** success sheet → "মেমো PNG সেভ/শেয়ার" · SMS status (পাঠানো হচ্ছে / সিঙ্কের পর যাবে / SMS বন্ধ) · "আরেকটি বাকি".

## 5. Payment (জমা নিন)
- Mobile → customer card (must exist)
- Amount with quick chips: "পুরো বাকি" + round values
- Method chips: **Cash · Card · bKash · Nagad**; TrxID field (optional) for bKash/Nagad
- Note (optional)
- Amount > due → confirm "অগ্রিম জমা হবে" (allowed, negative due shown as অগ্রিম)
- Save: transaction (`type: payment`, `effectPaisa = -amount`), `increment`, `lastPaymentAt`, smsQueue (`payment`, or `paymentClear` if new total ≤ 0)

## 6. Void / correction
- Any transaction can be voided with a reason (required). Batch: `voided: true`, reverse increment, auditLog.
- Voided rows stay visible (struck through) in the ledger. No hard delete anywhere.
- Settings → **ব্যালেন্স যাচাই** (repair): recompute each customer's due from non-voided `effectPaisa`, list mismatches, fix with `increment(diff)` + audit.

## 7. Opening balance bulk entry (চালু বাকি ইমপোর্ট)
Two ways, both in Settings → ইমপোর্ট:
1. **CSV upload** — template download button. Columns: `name, mobile, address, opening_due, as_of_date (optional, DD/MM/YYYY), note`. UTF-8 (tell the user: Excel → "CSV UTF-8").
2. **Quick grid** — spreadsheet-like rows (name, mobile, address, amount); `Enter` moves to the next cell; draft autosaved locally so nothing is lost.

Both go through a **preview**: invalid mobile, duplicate within file, already-existing customer (choose: skip / add as opening on top), amount parse errors. Shows totals before import.
Import writes in batches (≤ 450 ops): customer merge-set + `type: opening` transaction + increment.
**SMS default OFF for import.** Optional checkbox "সবাইকে বর্তমান বাকির SMS পাঠাও" with count + estimated cost and a confirm step.

## 8. SMS
**Language:** Bangla (Unicode). Digits in SMS: Bangla by default (`sms.digits`).
**Variables:** `{name} {amount} {total} {shop} {phone} {date} {method}` (`{shop}` = `smsShortName`).

Default templates (editable in Settings → SMS):
| Key | Default |
|---|---|
| bakiAdd | `{name}, আজ ৳{amount} বাকি যোগ হলো। মোট বাকি ৳{total}। -{shop}` |
| payment | `{name}, ৳{amount} জমা পেয়েছি, ধন্যবাদ। বাকি আছে ৳{total}। -{shop}` |
| paymentClear | `{name}, ৳{amount} জমা পেয়েছি। আপনার কোনো বাকি নেই, ধন্যবাদ। -{shop}` |
| reminder | `{name}, আপনার মোট বাকি ৳{total}। সুবিধামতো পরিশোধের অনুরোধ রইলো। -{shop}, {phone}` |
| opening | `{name}, আমাদের দোকানে আপনার বর্তমান বাকি ৳{total}। -{shop}` |

Default `smsShortName`: `অ্যালোপ্যাথিক স্টোর`.

**Template editor:** textarea per template, variable chips to insert, live preview with sample data, **character count + SMS segment count** (Unicode: 70 single / 67 per part; GSM-7: 160 / 153), estimated cost per SMS (`ratePaisa`), "Reset to default", "Send test SMS to my number".

**Sending flow:**
1. App renders the message and writes `smsQueue` (status `pending`) in the same batch as the transaction.
2. If online, the app calls Worker `POST /sms/process` with the queue id(s) and the Firebase ID token.
3. Worker claims each item (status `sending` with an `updateTime` precondition), calls the provider, sets `sent`/`failed` + `providerRef`/`lastError`.
4. Offline: the item syncs later; the app processes its synced pending items when back online; the Worker cron also sweeps `pending` items older than 2 min. Retry `failed` up to 3 attempts.
5. **Test mode** (`sms.testMode`, default ON until the provider is ready): Worker does not call the provider, marks status `test`. SMS Log shows "টেস্ট".

**Per-customer** `smsEnabled` off → no queue item for that customer (reminders included).
**SMS Log page:** list with status, kind, customer, segments, time; filter by status; retry failed; monthly count + estimated cost.

## 9. Reminder (তাগাদা)
Rules (all editable in Settings → রিমাইন্ডার):
- `enabled` true; `thresholdPaisa` = ৳5,000; **`intervalDays` = 2** (alternate day; set 1 for daily); `sendHour` = 10 (Dhaka); `maxPerMonth` = 15; `skipIfPaidWithinDays` = 2
- Eligible = `totalDuePaisa ≥ threshold` AND customer `smsEnabled` AND `reminderEnabled` AND not archived AND `lastReminderAt` older than `intervalDays` (minus 2h tolerance) AND no payment within `skipIfPaidWithinDays` AND monthly count < `maxPerMonth`

**Automatic:** Worker cron (every 10 min) runs the reminder job once per day when Dhaka hour == `sendHour` (guarded by `settings.reminder.lastRunDate`). Creates `smsQueue` items (`kind: reminder`), sends them, updates `lastReminderAt` and the monthly counter.
**তাগাদা page (app):** today's eligible list (computed client-side from customers), last reminder date, due, aging; buttons: এখনই পাঠাও (single), সবাইকে পাঠাও (bulk, shows count + cost, confirm), কল.

## 10. Reports
Date range picker (আজ / এই সপ্তাহ / এই মাস / custom), Dhaka timezone:
- মোট বাকি দেওয়া, মোট জমা (by method: Cash/Card/bKash/Nagad, including paid-now on bills), মোট ডিসকাউন্ট, নতুন কাস্টমার
- বাজারে মোট বাকি (now) + aging buckets: 0–30, 31–60, 61–90, 90+ days (count + amount)
- Top 10 due customers
- SMS sent + estimated cost
- Export: report PNG + CSV

## 11. PNG export
Rendered with html-to-image at 576 px width (same as an 80 mm thermal printer, for future printing), pixelRatio 2, white background, Hind Siliguri.

**Baki memo:**
```
M/S ALLOPATHIC STORE & SURGICAL
R.K Mission Road, Sreemangal · 01711460114
বাকি মেমো #B-261022-4F7K          ২২/১০/২০২৬ ১০:৩০
কাস্টমার: নাম · 01XXXXXXXXX
ওষুধ | পরিমাণ | দাম | মোট
...
সাবটোটাল · ডিসকাউন্ট · রাউন্ড · নেট · এখন জমা · এই বিলে বাকি
আগের বাকি · মোট বাকি
```
**Customer statement:** header + customer + date range + table (তারিখ, বিবরণ, বাকি, জমা, ব্যালেন্স) + current total due + generated time.
**Share:** `navigator.share({ files })` when supported (WhatsApp etc.), else download. Filename: `memo-B-261022-4F7K.png`, `statement-01XXXXXXXXX-2026-10.png`.

## 12. Settings (আরও → সেটিংস)
- দোকানের তথ্য: name, address, phone, SMS short name
- SMS: on/off, test mode, digits, rate per SMS, templates, test send, provider balance (if the Worker supports it)
- রিমাইন্ডার: all rules from section 9
- বিল: round to taka
- ভাষা: বাংলা / English; digits বাংলা / English
- নিরাপত্তা: PIN lock (4–6 digits, PBKDF2 hash in localStorage per device, lock on open + after N minutes idle)
- ব্যাকআপ: export all data as JSON + customers CSV; restore from JSON (with strong confirm); remind to export weekly
- ওষুধ: medicine list (search, add, edit, deactivate), shop price overrides, strip/pack sizes, price history, source + MedEx link per medicine
- ইমপোর্ট: section 7 (opening balances) and section 13 (medicine file import)
- ব্যালেন্স যাচাই: section 6

## 13. Medicine data
Full design: `docs/ARCHITECTURE.md` §0, §5, §6. Kaggle is **not** used.

- The shop keeps its **own medicine list** (`medicines` in Firestore, mirrored to Dexie on each device). Only medicines the shop sells go in it.
- Ways to fill it: quick add at the counter (from the box/MRP), the ওষুধ screen, and **file import** (Settings → ইমপোর্ট → ওষুধ).
- MedEx is a human reference: each medicine can store its MedEx link (`sourceUrl`), opened in the browser by the owner. MedEx's Terms forbid automated extraction, so the app never scrapes it. A MedEx file is imported only if MedEx gives written permission / an export.
- **Medicine import screen:** choose source (CSV template / licensed MedEx file) → upload → review table: new · changed (old → new price) · unchanged · missing from file · errors → tick rows → apply. Imports update only source fields, never the shop's own price overrides, never delete, never touch old bills.
- **CSV template columns** (UTF-8): `brand_name, generic_name, strength, dosage_form, manufacturer, unit_price, strip_price, pack_price, pack_description, pieces_per_strip, pieces_per_pack, source_url, source_date (DD/MM/YYYY)`. Only `brand_name` is required.
- Price shown on screen = shop override → source price for that unit → piece price × pieces per unit.
- **MedEx reference list** (Settings → ইমপোর্ট → MedEx ওষুধের তালিকা; owner confirmed MedEx's written permission): choose the `.xlsx` → preview (count, herbal count, skipped rows, 5 samples) → tick "আমার কাছে MedEx-এর লিখিত অনুমতি আছে" → upload. Other devices download it on their next sync. Searches (ওষুধ list, and the sale screen in Phase 4) show a **MedEx তালিকা থেকে** section under the shop's own matches; tapping one opens the add form prefilled (name, strength, form, generic, company, MedEx link) and the owner enters price/pack. Re-uploading the same file does nothing.
- **MedEx price file** (Settings → ইমপোর্ট → MedEx দামের ফাইল (CSV); columns `Brand Name, Dosage Form, Strength, Generic Name, Company, Unit Price (৳), Pack Info, All Prices, MedEx URL`): choose the `.csv` → preview (rows, with/without price, a warning when the file covers only part of the list, how many list brands get a price, which shop medicines' MedEx price changes before → after, samples) → tick the permission box → import. Prices are shown in **MedEx তালিকা থেকে** results; adding one fills pack + sizes and stores the MedEx price as the source price (the owner may still type their own). Shop medicines that are the same brand (same MedEx id, else the only one with the same name + strength + form) get their source prices, pack and link updated with price history; the owner's own prices and old bills never change. Tablets: per-piece price + box; liquids, tubes, vials: the first listed size is the piece (one bottle = one piece); ampoules/sachets with a box price keep both.

## 14. Acceptance checklist (manual, before pilot)
- [ ] Airplane mode: add customer, add baki (items + amount), take payment, void — all work; data visible instantly
- [ ] Back online: pending count goes to 0, data appears on the other device, queued SMS go out once (no duplicates)
- [ ] Same mobile typed again → old customer + history shows
- [ ] Discount none / 10% / ৳50 + round-off math correct; paid-now reduces bill baki
- [ ] Piece / strip / box / custom pricing correct; edited price saved and reused
- [ ] Change a medicine's price (manually or by import) → old bills and memos still show the old price and totals
- [ ] Medicine import: same file twice → second run shows 0 changes; shop price overrides untouched
- [ ] With internet off, medicine search and sale work normally
- [ ] Opening import: 50-row CSV with Bangla names imports correctly, no SMS sent
- [ ] SMS test mode → log shows "টেস্ট"; real mode → SMS received in Bangla, segment count matches
- [ ] Reminder: customer with ৳5,000+ gets one reminder at sendHour, not again before intervalDays; toggled-off customer gets none
- [ ] Memo + statement PNG render Bangla correctly and share to WhatsApp on Android
- [ ] PIN lock works; app installs on PC and Android
- [ ] Firebase usage page shows reads/writes far below the free quota after a normal day
