# QA notes — Phase 12 (2026-10-22)

Ei file e ache: ki ki automatic test hoy, SPEC §14 er checklist er kon item kivabe check kora hoyeche, ar deploy er por phone/PC te ki ki nije check korte hobe.

✅ = check kora hoyeche · 📱 = deploy er por asol phone/PC te check korte hobe · ⏳ = porer Phase e (SMS / তাগাদা)

## 1. Automatic test (protibar code bodlale chole)

| Ki | Kototi | Command |
|---|---|---|
| Unit test (taka, bill, discount, round, void, dam, snapshot, report, statement, import, backup, PIN, MedEx dam) | 174 | `cd web && npm test` |
| Security rules test (shudhu owner, lenden muchha jay na, ekbar-i void, log shudhu create) | 13 | `npm run test:rules` (project root) |
| TypeScript strict + lint | — | `cd web && npm run build && npm run lint` |

## 2. SPEC §14 checklist

| # | Item | Obostha | Kivabe check / ki baki |
|---|---|---|---|
| 1 | Internet chara: customer, বাকি (ওষুধ + সরাসরি টাকা), জমা, বাতিল | ✅ 📱 | Emulator bondho kore (offline) Phase 2–5 e check: shob save sathe sathe dekha jay, header e "সিঙ্ক বাকি" dekhay. Phone e airplane mode e abar dekhte hobe. |
| 2 | Internet ele "সিঙ্ক বাকি" 0 hoy, onno device e data ashe; SMS ekbar-i jay | ✅ ⏳ 📱 | Pending 0 hoya emulator e check (Phase 3, 5). Duita device (PC + phone) live site e check korte hobe. SMS: Phase 7. |
| 3 | Eki mobile abar dile purono customer ar hisab ashe | ✅ | Phase 2, 4 (mobile diye khoja, customer id = mobile). |
| 4 | Discount nei / 10% / ৳50 + round-off; এখন জমা bill er baki komay | ✅ | Unit test (billing, saleDraft). 22/10 smoke test: ৳150 − 10% = ৳135, ৳35 joma → ei bill e baki ৳100. |
| 5 | পিস / স্ট্রিপ / বক্স / কাস্টম dam; bodlano dam "দোকানের দাম হিসেবে সেভ" | ✅ | Unit test (5 item er bill) + Phase 4 browser. 22/10: strip × 3 = ৳150 thik. |
| 6 | Oshudher dam bodlale (nije ba import e) purono bill/memo bodlay na | ✅ | Unit test "snapshot does not change"; MedEx dam import e 26 ta oshudher dam bodleche, purono memo eki ache. |
| 7 | Eki import file dubar → 0 change; nijer dam thik thake | ✅ | Unit test (idempotent, apply → plan again = 0); MedEx dam import e nijer dam (jemon Amdocal ৳4.40) bodlayni. |
| 8 | Internet chara oshudh khoja ar bikri | ✅ 📱 | Phase 3–4 (oshudh list device e Dexie te thake). |
| 9 | 50 row er চালু বাকি CSV, Bangla nam; kono SMS jay na | ✅ | Unit test + Phase 6 browser. SMS ekhono nei, tai kono SMS jay na. |
| 10 | SMS test mode / asol SMS | ⏳ | Phase 7 (SMS provider thik hole). |
| 11 | তাগাদা (৳5,000+ hole, sendHour e, intervalDays er age abar na) | ⏳ | Phase 8. |
| 12 | মেমো + স্টেটমেন্ট PNG Bangla thik; Android e WhatsApp share | ✅ 📱 | Bangla juktakkhor thik (Phase 10, 12). WhatsApp share shudhu asol Android phone e check kora jabe. |
| 13 | PIN lock; PC ar Android e install | ✅ 📱 | PIN: Phase 11 (lock, bhul PIN, 30 sec opekkha, idle lock, PIN ভুলে গেছি). Install er jonno HTTPS live site lagbe. |
| 14 | Ekta shadharon diner por Firebase usage free limit er onek niche | 📱 | Live site e ek din chalanor por Firebase console e dekhte hobe (RUNBOOK §9). |
| + | Backup → khali database e restore → hubohu eki | ✅ | Phase 11: 7 ta collection er protiti document eki, mot baki eki, ব্যালেন্স যাচাই e gormil nei. |

### 22/10 er smoke test (Phase 12 er build)
- Login, Home, কাস্টমার, নতুন বাকি (MedEx dam soho A-Cal 500 strip × 3, 10% discount, ৳35 Cash) → save → memo sheet → লেনদেনের হিসাব e বাতিল ("QA test") → baki abar ৳14,870. ✅
- রিপোর্ট, সেটিংস, ইমপোর্ট, চালু বাকি, ওষুধের দামের ফাইল page — alada kore load hoy, sob khole. ✅
- রিপোর্ট er ছবি (PNG) — thik ase. (Lukano browser pane e html-to-image animation frame er opekkhay atke thake; asol phone e app samne thake, tai somossa na.)

## 3. Performance / PWA

- Shuru te JavaScript ~1.2 MB (gzip ~370 KB), er beshirbhag Firebase SDK (offline cache soho Firestore). রিপোর্ট, সেটিংস, ইমপোর্ট, xlsx/CSV reader ar ছবি বানানো alada chunk e, dorkar holei load hoy. Sob chunk service worker e precache hoy, tai offline o khole.
- Manifest: nam, Bangla, standalone, 192/512 + maskable icon, theme color ✅. Service worker: "নতুন ভার্সন" prompt (registerType prompt) ✅.
- Hosting header: `index.html`, `sw.js`, manifest → no-cache (update druto pay); `/assets/**` → 1 bochhor immutable; `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- **Lighthouse (deploy er por):** Chrome e live link khulun → F12 → Lighthouse → Device: Mobile → "Analyze page load". Target: PWA installable, Performance 70+. Ekhane emulator site e chalano hoyni, karon HTTPS ar asol Firebase chara result thik hoy na.

## 4. Deploy (22/10/2026)

- Live: **https://baki-khata-d7304.web.app** — Hosting, security rules (owner UID soho) ar 3 ta index deploy hoyeche.
- Check kora: sob page 200; `index.html`/`sw.js`/manifest no-cache, `/assets` immutable, security header ache (HSTS Firebase nijei dey); login chara dokaner data porle **403**; Email/Password login chalu; live login page e kono console error nei, emulator er "টেস্ট মোড" nei.
- Asol login (owner er password) ar data lekha owner nije check korben (niche).

## 5. Deploy er por pilot test (owner — phone ar PC)

1. PC te Chrome e link khulun → login → install (RUNBOOK §2).
2. Phone e Chrome e link khulun → login → install → PIN chalu korun.
3. Phone e airplane mode chalu → ekta customer, ekta বাকি, ekta জমা, ekta বাতিল korun → sob sathe sathe dekhay kina dekhun.
4. Airplane mode bondho → header er "সিঙ্ক বাকি" 0 hoy kina dekhun → PC te same lenden gulo ashe kina dekhun.
5. Ekta memo er ছবি WhatsApp e nijer number e share korun → Bangla thik ache kina dekhun.
6. Settings → ব্যাকআপ নিন → file duita Google Drive e rakhun.
7. Porer din Firebase console e usage dekhun (RUNBOOK §9).
