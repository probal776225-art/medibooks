# MediBooks — Runbook (owner er jonno)

M/S ALLOPATHIC STORE & SURGICAL, R.K Mission Road, Sreemangal

App er link: **https://medibooks.web.app** (Firebase project: `baki-khata-d7304`)

Purono link `https://baki-khata-d7304.web.app` o eki app dekhay, eki data. Tobe notun phone/PC te **medibooks.web.app** i install korun. Purono link e install kora app thakle: "সিঙ্ক বাকি" 0 hole seta uninstall kore notun link e login + install + PIN korun.

Ei khatay ache: prothombar setup, PC/phone e install, protidiner kaj, internet na thakle ki hoy, bhul thik kora, backup, SMS ar তাগাদা, Firebase er free limit dekha, ar kono somossa hole ki korben.

---

## 1. Prothombar setup (ekbar-i korte hobe)

Eta Firebase e apnar nijer "project" banano. Free (Spark plan), kono card lagbe na.

1. Chrome e **console.firebase.google.com** khulun, apnar Google account diye dhukun.
2. **Create a project** (ba "Add project") chapun → nam din `baki-khata` → Google Analytics **bondho** rakhun → **Create project**.
   - Project er nicher lekha **Project ID** (jemon `baki-khata-1a2b3`) mone rakhun.
   - Billing / card add korben **na**. Spark plan e kono khoroch hoy na.
3. Bam pashe **Build → Firestore Database → Create database**:
   - Location: **asia-south1 (Mumbai)** (Bangladesh er kachhe). Eta pore bodlano jay na.
   - Mode: **Production mode** → **Create**.
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
5. **Authentication → Users → Add user**: apnar email ar ekta shokto password (12 ta ba beshi okkhor) din → **Add user**.
   - Tarpor list e apnar user er **User UID** (lomba okkhor-sonkha) copy korun. Eta gopon password na; eta diye app jane apni-i malik.
   - Jodi **Authentication → Settings → User actions** e "Enable create (sign-up)" dekhen, tick ta tule din. Tahole onno keu account khulte parbe na. (Khulleo kono hisab dekhte parbe na — shudhu apnar UID ke onumoti deya ache.)
6. Gear icon (⚙) → **Project settings → General → Your apps** → **Web (`</>`)** icon → nickname `baki-khata-web` → **Register app**. Config dekhabe — copy korar dorkar nei.
7. Ei computer e project folder theke Terminal e ekbar chalan (browser khulbe, Google account bechhe **Allow** din):

   ```bash
   npx firebase login
   ```

8. Claude ke din: **Project ID** ar **User UID**. Baki kaj (config file, deploy) Claude korbe, apnar "OK" niye.

> Developer er jonno: config `web/.env.deploy.local` e thake (git e jay na), `web/.env.example` dekhun. Deploy: project root theke `npm run deploy`. Shudhu app update: `npm run deploy -- --only hosting`.

---

## 2. Install kora

**PC (Chrome):**
1. Chrome e app er link khulun → email ar password diye login korun.
2. Address bar er dan pashe install icon (⊕ / monitor er moto) chapun → **Install**. Na dekhle: **⋮ → Cast, save and share → Install page as app** (ba "Install MediBooks").
3. Ekhon desktop / Start menu theke "MediBooks" alada window e khulbe.

**Android phone (Chrome):**
1. Chrome e link khulun → login korun.
2. **⋮ → Install app** (ba "Add to Home screen") → **Install**.
3. Home screen e "MediBooks" icon ashbe. Ekhan thekei khulben.

> Install er option login er **pore** ashe (tokhon app offline er jonno nijeke save kore).

**Install er por prothom kaj:** Settings (আরও → সেটিংস) → **নিরাপত্তা → PIN চালু করুন** (protiti phone/PC te alada PIN).

---

## 3. Protidiner kaj

| Kaj | Kothay | PC shortcut |
|---|---|---|
| Notun বাকি (oshudh ba sorasori taka) | নতুন বাকি (nicher majher + button) | **F2** |
| Joma neya | জমা নিন | **F4** |
| Save | সেভ করুন | **Ctrl + Enter** |
| Customer khoja | Home er search e mobile ba nam | — |

- **নতুন বাকি:** mobile number likhun → purono customer hole tar baki dekhabe, notun hole nam din → oshudh khujun → পিস / স্ট্রিপ / বক্স / কাস্টম → dorkar hole dam bodlan → discount → **এখন জমা** (jodi kichu dey) ar kivabe dilo (Cash / bKash …) → **সেভ করুন**.
- Dam bodlale "এই দাম দোকানের দাম হিসেবে সেভ করুন" chaple porer bar oi dam-i ashbe.
- **Save na kora bill:** bill save na kore onno page e gele bill ta phone e thake. Porer bar নতুন বাকি khulle holud box e jiggesh korbe — **নতুন বিল শুরু করুন** (purono oshudh muche) ba **আগের বিলটাই চালিয়ে যান**. Save korle bill sathe sathe khali hoy; 6 ghontar purono asomapto bill nijei muche jay.
- Oshudh list e nei? Search e nam likhle nicher **MedEx তালিকা থেকে** theke **যোগ করুন** chapun — MedEx er dam thakle nijei boshe jabe.
- **মেমোর ছবি / রসিদের ছবি:** save er por sheet e ba customer er **লেনদেনের হিসাব** e lenden e tap kore → **শেয়ার করুন** → WhatsApp.
- **স্টেটমেন্ট:** customer page → **স্টেটমেন্ট** → এই মাস / গত মাস / সব সময় → **ছবি তৈরি করুন** → share.
- **রিপোর্ট:** আরও → রিপোর্ট → আজ / এই সপ্তাহ / এই মাস → **CSV নামান** (Excel) ba **ছবি (PNG)**.

---

## 4. Internet na thakle

- App **purotai chole**: bikri, joma, customer, oshudh khoja — shob.
- Upore holud **"সিঙ্ক বাকি: N"** mane N ta lekha ekhono server e jayni. Internet ele nijei chole jabe, N **0** hobe.
- **N 0 na howa porjonto logout korben na, ar browser er data muchben na.**
- Onno phone/PC te oi lenden internet ele dekhabe.

---

## 5. Bhul hole

- **Bhul lenden:** customer page → লেনদেনের হিসাব → lenden e tap → **এই লেনদেন বাতিল করুন** → karon likhun. Lenden muchhe na; "বাতিল" hoye thake, baki thik hoye jay.
- **Baki hisab mile na mone hole:** সেটিংস → **ব্যালেন্স যাচাই → যাচাই করুন** (internet lagbe). Gormil thakle dekhabe, thik korar option dibe.
- **Customer er mobile number bodle geche:** customer page → **মোবাইল নম্বর বদলান** (internet lagbe). Purono hisab notun number e chole jay.
- **Customer muchte chan:** customer page → nicher dike **কাস্টমার মুছুন** (shudhu owner).
  - Kono lenden nei (bhul kore add hoyeche): **হ্যাঁ, পুরোপুরি মুছে ফেলুন** → customer ar tar prescription er chhobi muche jay (internet lagbe, fire ashe na).
  - Lenden ache: hisab thik rakhte puropuri muche na. **লুকিয়ে রাখুন (আর্কাইভ)** chaple list theke sore jay; baki thakle "বাজারে মোট বাকি" te ar gona hoy na. Fire ante: কাস্টমার → **আর্কাইভ** filter → customer → **আর্কাইভ থেকে ফেরান**.

---

## 6. Backup (proti soptahe)

1. সেটিংস → **ব্যাকআপ → ব্যাকআপ নিন (JSON + CSV)** (internet lagbe).
2. Duita file Downloads e ashbe: `baki-backup-tarikh.json` (sob hisab) ar `baki-customers-tarikh.csv` (Excel e khola jay).
3. Duitai **Google Drive** ba pendrive e rakhun.
4. 7 din backup na nile Home e holud reminder ashbe.

**Restore** shudhu **khali** database e kora jay (jemon notun Firebase project). Ekhonkar kono hisab mochhe na. সেটিংস → ব্যাকআপ → **রিস্টোর** → JSON file → `RESTORE` likhun → **রিস্টোর শুরু করুন**. Majhpothe thame gele (internet / free limit) eki file diye abar chalan — jekhane themechilo shekhan theke chalbe.

---

## 7. Prescription er chhobi

- Customer page → **প্রেসক্রিপশন** → **ছবি তুলুন** (phone er camera) ba **গ্যালারি থেকে** (PC te file).
- **নতুন বাকি** te customer bechhe nileo **প্রেসক্রিপশন** ongsho ashe — bill banate banate chhobi tola jay, ar shesh 4 ta chhobi dekha jay.
- Chhobi phone ei chhoto hoye jay (prai 100–400 KB), tarpor note (jemon daktar er nam) dile **সেভ করুন**. Internet na thakleo save hoy, pore nije upload hoy.
- Chhoto chhobi te chap dile boro hoy; chhobi te abar chap dile zoom. **শেয়ার করুন** / **ছবি সেভ করুন**.
- Bhul chhobi: boro chhobi → **ছবি মুছুন** → **হ্যাঁ, মুছুন**. Muchle ar fire ashe na.
- সেটিংস → **জায়গা** te dekhben koto chhobi ache, ar free 1 GB er koto ongsho lagche. 70% er beshi hole holud satorkota ashbe.
- Backup e chhobi o thake. File onek boro hole **"ছবিও ব্যাকআপে রাখুন"** tick tule din, tokhon chhobi chara baki sob thakbe.

## 8. Staff (kormochari)

- **Staff jog:** সেটিংস → **স্টাফ** → **+ স্টাফ যোগ করুন** → nam, staff er email ar ekta password (8+ okkhor) → **স্টাফ অ্যাকাউন্ট খুলুন** (internet lagbe). Email ar password staff ke bole din.
- Staff nijer phone/PC te **medibooks.web.app** e oi email/password diye login korbe, tarpor nijer **PIN** chalu korbe.
- **Staff ja parbe:** customer khuja/notun customer, **নতুন বাকি**, **জমা নিন**, prescription er chhobi, MedEx list theke oshudh jog (dam chara — dam apni thik korben).
- **Staff ja parbe na:** বাতিল, dam/setting bodlano, ইমপোর্ট, ব্যাকআপ, ব্যালেন্স যাচাই, mobile number bodol, chhobi muchha. Staff shudhu **nijer** lenden ar **আমার রিপোর্ট** dekhbe; bazarer mot baki ba onno karo kaj dekhbe na.
- **Kar kaj dekhte:** রিপোর্ট → **কার হিসাব** → সবাই / মালিক (আমি) / staff er nam.
- **Staff chole gele:** সেটিংস → স্টাফ → tar switch **বন্ধ** korun — sathe sathe kono hisab dekhte parbe na. Pore abar chalu kora jay.
- **Staff password bhule gele:** সেটিংস → স্টাফ → **পাসওয়ার্ড রিসেটের ইমেইল পাঠান** (staff er email e link jabe).

## 9. Oshudh ar dam

- **ওষুধ → সব ওষুধ:** dokaner oshudh ar MedEx er sob oshudh ek sathe. MedEx er oshudh ("MedEx" chinho) alada kore jog korte hoy na — bill e sorasori tola jay; prothombar bikri ba **এডিট** korle nijei dokaner list e uthe jay.
- **একই জেনেরিক / বিকল্প:** oshudher page e (ওষুধ → oshudh) niche dekhabe eki generic ar strength er onno brand (sostar ta age), ar onno strength/dhoron. Internet chara o kaj kore.
- Bikolpo deyar age daktar er lekha ar rogi er sathe miliye nin.

- **Nijer dam:** ওষুধ → oshudh → এডিট → dam. Import e apnar dam kokhono bodlay na.
- **Supplier er dam er file (CSV):** সেটিংস → ইমপোর্ট → ওষুধের দামের ফাইল.
- **MedEx dam er file (CSV):** সেটিংস → ইমপোর্ট → **MedEx দামের ফাইল** → file → ki bodlabe dekhe → onumoti tick → **দাম ইমপোর্ট করুন**. Puro file pele abar ekhanei din.
- Purono bill er dam kokhono bodlay na.

---

## 10. SMS ar তাগাদা

SMS jay **bulksmsbd.net** diye, ekta chhoto free server er maddhome (**Cloudflare Worker**). API key shudhu oi server e thake — app ba phone e kokhono na.

### Ekbar-i korte hobe (setup)

1. **bulksmsbd panel:** login → **Phone Book → IP White List** → **IP White Listing Setting** → **Disable** → phone e asha OTP din. (Cloudflare er IP bodlay, whitelist chalu thakle SMS jabe na — error `1032`.)
2. **Cloudflare:** **dash.cloudflare.com/sign-up** e free account khulun (card lagbe na). Email verify korun.
3. Terminal e (project folder er `worker` folder theke) `npx wrangler login` → browser e **Allow** chapun.
4. **Firebase er "service account" file:** console.firebase.google.com → project → ⚙️ **Project settings → Service accounts → Generate new private key → Generate key**. Ekta `.json` file Downloads e ashbe. **Eta karo sathe share korben na.**
5. Claude ke bolun "Worker deploy koro" — Claude `npm run deploy:worker` chalabe (ekta link dibe: `https://medibooks-sms.….workers.dev`).
6. Terminal e `worker` folder theke duita command (key/file **chat e paste korben na**):
   - `npx wrangler secret put SMS_API_KEY --name medibooks-sms` → bulksmsbd er API key paste kore Enter.
   - `npx wrangler secret put SERVICE_ACCOUNT_JSON --name medibooks-sms < ~/Downloads/<oi-file>.json`
   - Tarpor Downloads theke oi `.json` file ta **muche** din (Trash o khali korun).
7. Claude app ta abar deploy korbe (Worker er link app e boshe).
8. App e: সেটিংস → **SMS** → **টেস্ট SMS পাঠান** → nijer number → **পাঠান**. Phone e SMS ashle **টেস্ট মোড** **বন্ধ** korun. Ekhane **প্রতি SMS-এর দাম** (jemon `0.35`) dile khorcher hisab dekhabe.

### Protidin

- **নতুন বাকি** ba **জমা নিন** save korlei customer SMS pay (customer er **SMS পাঠাবে** chalu thakle). Save er por niche lekha thake SMS jacche kina.
- Internet na thakle SMS phone e jome thake, internet ele nije chole jay (ba server 10 minute por por nije pathay). Ek SMS dui bar jay na.
- **SMS লগ** (আরও → SMS লগ): sob SMS, **পাঠানো / অপেক্ষায় / যায়নি / টেস্ট**. "যায়নি" hole karon lekha thake, **আবার পাঠান** chapa jay. Upore ei maser SMS songkha ar khoroch.
- সেটিংস → SMS → **ব্যালেন্স দেখুন**: bulksmsbd te koto taka ache. Balance shesh hole SMS "যায়নি (1007)" hobe — recharge kore SMS লগ e **আবার পাঠান**.
- **SMS er lekha bodlate:** সেটিংস → SMS → **SMS-এর লেখা** → **এডিট**. Nam/taka/mot baki er bolgula chap diye bosano jay; niche namuna ar koto bhag (khoroch) dekhay. Bangla SMS e 70 okkhor = 1 bhag; beshi hole 67 okkhore 1 bhag.

### তাগাদা (baki r reminder)

- **Nijei jay:** protidin **সকাল ১০টা**-r por (server prothom 10 minute er moddhe), jader baki **৳৫,০০০+**, protiti customer ke **2 din por por**, mashe sorbochcho **15 bar**. Gato **2 diner** moddhe joma dile oi din jay na. Customer er **SMS পাঠাবে** ba **অটো তাগাদা** bondho thakle jay na. Raat 9 tar por kokhono jay na.
- **Niyom bodlate:** সেটিংস → **তাগাদা (রিমাইন্ডার)** → taka / din / somoy / mashe koto bar → **সেভ করুন**. Puro bondho: **অটো তাগাদা চালু** switch off.
- **তাগাদা page** (nicher bar e): aaj kake pathano jay tar list (boro baki age) → **এখনই পাঠান** (ekjon), **সবাইকে পাঠান** (koto jon, koto bhag, khoroch dekhiye jiggesh korbe), **কল**. **আজ বাদ** e dekhay ke keno bad (sompratik pathano, sompratik joma, SMS bondho…).
- Ekjon customer ke: customer page → **এখনই রিমাইন্ডার**.
- **টেস্ট মোড** chalu thakle tagada o shudhu লগ e "টেস্ট" hoy, customer pay na.

---

## 11. Firebase er free limit dekha

Spark (free) plan e protidin: **50,000 read, 20,000 write, 1 GiB data**. Card nei, tai kokhono taka katbe na. Limit pere gele oi diner baki shomoy server e lekha bondho thake (app offline er moto chole, data phone e jome thake). Limit protidin **Bangladesh shomoy dupur 1–2 tar dike** abar shuru hoy.

Dekhar niyom:
1. **console.firebase.google.com** → apnar project → **Firestore Database → Usage** tab.
2. Ekta shadharon diner por read/write limit er onek niche thakar kotha (koyek hajar).
3. Kono din hothat onek beshi dekhle Claude ke janan.

---

## 12. Somossa hole

| Somossa | Ki korben |
|---|---|
| Niche **"নতুন ভার্সন এসেছে"** | **রিলোড** chapun (age "সিঙ্ক বাকি" 0 hoyar opekkha korun). |
| **PIN bhule gechen** | Lock screen e **PIN ভুলে গেছি** → logout → email + password diye login (internet lagbe) → notun PIN din. |
| **Password bhule gechen** | Firebase console → Authentication → Users → apnar user er **⋮ → Reset password** (email e link ashbe). |
| **Phone harie geche** | Sathe sathe Firebase console theke password bodlan. Purono phone e login 1 ghontar moddhe bondho hoye jabe. PIN thakle oi phone e app khola jabe na. |
| App khule na / sada page | Internet chalu kore app bondho kore abar khulun. Na hole Chrome e link khule dekhun. |
| "সার্ভারে সেভ হয়নি" lal message | Internet / login thik ache kina dekhun. Bar bar hole Claude ke screenshot din. |

---

## 13. Notun version deploy (developer)

```bash
cd ~/Claude/pharmacy-baki
npm run deploy
```

Script age check kore: real project (demo na), emulator bondho, owner UID ache. Tarpor app build kore Hosting + security rules + index deploy kore, sheshe link dekhay.

SMS server (Cloudflare Worker) alada deploy hoy: `npm run deploy:worker` (`web/.env.deploy.local` e `SMS_SENDER_ID` lage; API key ar service account shudhu `wrangler secret put` diye, §10). Worker er link `VITE_WORKER_URL` hisebe `web/.env.deploy.local` e boshe, tarpor `npm run deploy`.
