# Bangladeshi kids-clothing businesses that run Google Ads (research notes, 2026-10-31)

> **Read this first: no business here has VERIFIED Google Ads activity.** This session's network blocked every direct check:
> - `adstransparency.google.com` was refused. `curl` through the session proxy got `CONNECT tunnel failed, response 403` (connect_rejected), and WebFetch got `getaddrinfo ENOTFOUND`, meaning the host is outside the session's allowed network domains. So the Transparency Center UI and its RPC endpoints (`/anji/_/rpc/SearchService/SearchSuggestions`, `/SearchCreatives`) could not be called at all.
> - The brand homepages were refused the same way: `lerevecraze.com` (both curl and WebFetch), and `www.aarong.com`, `yellowclothing.net` and `www.sailor.clothing` (curl). So no HTML could be checked for `AW-` conversion IDs, `googleadservices.com` or `gtag` config.
> - That left only web search, which found no agency case study, job post, news item or ad-intelligence page that names any Bangladesh kids-wear business as a Google Ads advertiser.
>
> To finish verification, allow `adstransparency.google.com` and the brand domains in the environment's network settings (cloud environment menu, then Edit, then Network access: a broader level or Allowed domains; steps at https://code.claude.com/docs/en/cloud-environments#network-access). Then re-run: (a) Transparency Center search by domain with region=BD; (b) homepage HTML grep for `AW-`, `googleadservices.com`, `gtag/js?id=AW-`, `GTM-`.
>
> Every business below is a real business with a public source. Each is labelled **Unverified** for Google Ads. The ranking reflects how likely each one is to advertise on Google (own e-commerce site, scale, current 2026 marketing), not proven ad activity.

## Which Bangladeshi kids-wear businesses appear as advertisers in the Google Ads Transparency Center (region BD)?

### Takeaway
This could not be answered. The Transparency Center (UI and RPC endpoints) is blocked in this session's network, and its result pages are not indexed by web search. Not one BD kids-wear advertiser could be confirmed or ruled out from the Transparency Center.

### Cited Findings
- Direct access attempts on 2026-10-31: `curl https://adstransparency.google.com/?region=BD` returned proxy `403` (connect_rejected), and WebFetch returned `ENOTFOUND` (host not in the allowed network domains). The session's own documentation says this host has to be added under Allowed domains. Setup steps: [Claude Code cloud environments, network access](https://code.claude.com/docs/en/cloud-environments#network-access)
- A search for third-party ad-intelligence pages (AdSpyder, SimilarWeb, BuiltWith, SEMrush, SpyFu) on `lerevecraze.com`, `aarong.com`, `sailor.clothing`, `yellowclothing.net` and SaRa returned no domain report for any of them, only vendor sample pages. [AdSpyder ad library](https://adspyder.io/ad-library); [AdSpyder ad analytics](https://adspyder.io/ad-analytics)
- AdSpyder's domain report for **bata.in** (Bata **India**, not Bata Bangladesh) estimates about 626 active ads across Google Display, Google Search, LinkedIn and others, with "Google Ads 97% of ads", and lists Bangladesh among the countries. This is a vendor estimate for the Indian domain and is not evidence for Bata Bangladesh's own account. [AdSpyder – bata.in](https://adspyder.io/domain-paid-ad-analysis/bata.in)
- TheirStack has a page "Companies that use Google Ads in Bangladesh" (about 50 companies). The public preview shows only about 10, in software, IT services, hospitals and marketing services. No apparel firm is visible, and the full list sits behind a download. [TheirStack – Google Ads, BD](https://theirstack.com/en/technology/google-ads/bd)

### Inferences
- Because the Transparency Center could not be reached, every "evidence strength" below is **Unverified**. Re-running the Transparency Center check is the single most useful next step. Domain search (e.g. `lerevecraze.com`) with region Bangladesh shows any verified advertiser and its ad formats (text, image, video) with first/last shown dates.
- The bata.in result hints that Bata as a group buys Google ads in South Asia. Bata Bangladesh is a separate local company with its own site, so it still needs its own check.

### Gaps
- Transparency Center advertiser names, ad counts, formats and dates for every candidate: blocked (network policy).
- The RPC endpoints `SearchService/SearchSuggestions` and `SearchService/SearchCreatives` could not be tried, because the whole host is refused at the proxy.

## Other evidence of Google Ads activity (site tags, Shopping, agency case studies, job posts, news)

### Takeaway
No indirect evidence (site tags, agency case study, job post or news) links any specific Bangladesh kids-wear business to Google Ads. Site-tag checks were impossible because the brand domains are blocked. The only Google-Ads-adjacent items found are generic (BD agencies and freelancers that sell Google Ads to fashion clients) or not attributable to a BD brand.

### Cited Findings
- **Site HTML tag check: not possible.** Fetching `lerevecraze.com` (curl and WebFetch), `www.aarong.com`, `yellowclothing.net` and `www.sailor.clothing` (curl) all failed with proxy connect_rejected / ENOTFOUND on 2026-10-31. Same network-policy cause as above. [Claude Code cloud environments, network access](https://code.claude.com/docs/en/cloud-environments#network-access)
- **Agency case studies:** a search for a Bangladeshi agency's Google Ads case study on a kids-fashion brand found none. Ads Supremacy (BD) says it targets fashion buyers with campaigns segmented by product type, gender and style, but names no clients. [Ads Supremacy – Google Ads](https://adssupremacy.com/google-ads/)
- A BD freelancer (Sakil Mahmud) sells Google Ads to **garment exporters** that target buyers for UK/EU/US children's brands. That is B2B factory marketing, not a BD kids-wear retailer. [sakilmahmud.com](https://sakilmahmud.com/google-ads-for-garments-bangladesh/)
- A Dhaka agency (Ngital) lists Google Ads case studies for a coconut-oil brand (Shurobhi) and Prime Bank Investment, but none for fashion or kids-wear. [Ngital – Google Ads](https://ngital.com/services/google-ads)
- A search for Aarong, Sailor, Le Reve or Yellow in a BD agency's Google Ads case study returned nothing relevant. [Ngital](https://ngital.com/); [Yellow (clothing) – Wikipedia](https://en.wikipedia.org/wiki/Yellow_(clothing))
- **Job posts:** no bdjobs or other circular was found from Aarong, Sailor, Le Reve, Sara Lifestyle, Ecstasy or a kids-wear brand that asks for Google Ads skills. The nearest hits were a Dhaka "Google Ads Specialist" at an agency (Talibrate) serving mixed industries, and an Aarong **Dairy** (not fashion) digital-marketing deputy manager post whose requirements were not visible. [Careerjet BD – Google Ads Specialist](https://www.careerjet.com.bd/jobad/bd2bd6d042004a20e351dd3251bc5bfea2); [Aarong Dairy digital role (aggregator)](https://eurostaffs.org/job/deputy-manager-digital-marketing-and-consumer-engagement-aarong-dairy-brac-8)
- A closed Freelancer.com project wanted a specialist to run Meta **and Google** ads for a "fast-growing kidswear fashion brand". The country and brand are not stated, so it can't be tied to a BD business. [Freelancer project](https://www.freelancer.com/projects/google-ads/performance-marketing-expert-meta-google)
- **Apex Footwear's kids campaign:** "Happy Children's Day – Twinkler by Apex Footwear" (Bangladesh, Nov 2024, agency ApexMKT) is listed as a static/print design (tools: Photoshop, Illustrator). There is no mention of YouTube or Google ads. [Ads of the World](https://www.adsoftheworld.com/campaigns/happy-children-s-day-twinkler-by-apex-footwear)
- Other Apex campaigns found were "There is a Player Inside All of Us" (2022, agency Lie to Eye) and a 2019 street fashion show (Grey). Neither is described as a Google/YouTube buy, and both are older than 2024, so possibly outdated. [Ads of the World – Lie to Eye](https://www.adsoftheworld.com/campaigns/there-is-a-player-inside-all-of-us); [Ads of the World – Apex street fashion show](https://www.adsoftheworld.com/campaigns/apex-street-fashion-show)
- **News:** 2026 Eid coverage confirms that several general brands launched kids lines and sell them **online**. This shows active e-commerce and marketing, not Google Ads.
  - Sailor's Eid Collection 2026 includes a kids line, sold at all outlets nationwide and through its official online platform. [Daily Star press release](https://online-d11.thedailystar.net/lifestyle/news/sailor-unveils-grand-eid-collection-2026-featuring-contemporary-fashion-the-entire-family-4122856); [TBS – Sailor Eid 2026 in stores and online](https://www.tbsnews.net/economy/corporates/sailor-eid-collection-2026-now-available-stores-and-online-1376516)
  - Le Reve's Eid/26 kids range (salwar kameez, ghagra-choli, frocks, tunics, top-bottom sets, panjabis, polos, t-shirts) was unveiled at a Dhaka event in February 2026. [Sylhet Mirror](https://sylhetmirror.com/?p=195754); [Bangladesh Monitor](https://www.bangladeshmonitor.com.bd/en/le-reves-eye-catching-eid-collection-hits-stores)
  - iNFINITY Mega Mall's Eid Collection 2026 has a kids section. [Daily Star](https://www.thedailystar.net/lifestyle/news/eid-collection-2026-celebrate-elevated-elegance-infinity-mega-mall-4124331); [Daily Dhaka Times](https://dailydhakatimes.com/infinity-mega-mall-unveils-stylish-eid-collection-2026/)
  - Bata launched an Eid footwear collection with "over 2,000 styles" (the date is not shown in the snippet). [Daily Star press release](https://online-d11.thedailystar.net/business/organisation-news/press-releases/news/bata-launches-eid-footwear-collection-over-2000-styles-4121471)
  - A TBS feature on 2026 children's Eid wear covers kids' collections across brands. [TBS – Eid style for the little ones](https://www.tbsnews.net/features/mode/eid-style-little-ones-1388081)

### Inferences
- The large lifestyle brands (Sailor, Le Reve, Aarong, Bata, Apex, Yellow, iNFINITY) are the most likely Google advertisers. They run national e-commerce sites, launch big seasonal (Eid/Puja) campaigns covered by the press, and have in-house or agency marketing teams. This is an inference from scale and online-sales activity, not evidence. Each still needs a Transparency Center or tag check.
- Small dedicated kids-wear shops in BD mostly appear to sell through Facebook, marketplaces (Daraz, Othoba, Rokomari, Bikroy) or hosted store builders (e.g. zatiqeasy). That fits the general pattern of BD small e-commerce relying on Meta ads, which makes Google Ads less likely for them. This is an inference only; no source quantifies it for kids-wear.

### Gaps
- Homepage `AW-` / `googleadservices` / `gtag` checks for every candidate: blocked (network policy). This is the most direct indirect check once the domains are allowed.
- Google Shopping listings: no way to check from search alone.
- Job posts for Google Ads roles at the named brands: none found. Absence of evidence is not evidence of absence, because bdjobs listings expire and are poorly indexed.
- Ecstasy, Richman/Infinity (Lubnan), Taaga, Cat's Eye, Easy and other brands the requester named returned no relevant results in this session's searches, beyond the iNFINITY Mega Mall Eid 2026 article. Their kids lines and domains are not confirmed here.

## Which are dedicated kids-wear brands with their own e-commerce website (most useful leads)?

### Takeaway
Six dedicated BD kids/baby-wear businesses with their own web store were found: Clothxtra, PTex, Trends Kids, Yusha, Honesty MRT (hosted store) and Duronto Kids (directory listing only). Six more dedicated kids-wear brands appear mainly offline or social-first: Shoishob, Lullabys, Double Rainbow, Periwinkle, Kids Sunnah Store and Little Angels. None of them has verified Google Ads activity. The general brands with 2026 kids lines and online stores (Le Reve, Sailor, iNFINITY, Bata, Aarong, Apex) are the likeliest Google advertisers. All entries below are **Evidence strength: Unverified** for Google Ads, checked 2026-10-31.

### Cited Findings

**Ranked lead list (rank = likelihood of Google Ads, NOT verified activity)**

*Tier 1: kids lines of large brands with own online stores and current (2026) campaigns*
1. **Le Reve.** Category: kids line of a general brand. Website: lerevecraze.com (appears in search results; homepage fetch blocked). City: Dhaka (Eid/26 launch event in Dhaka). Evidence of Google Ads: none found. Strength: Unverified. Evidence date: Feb 2026 (kids Eid line). [lerevecraze.com](https://lerevecraze.com/); [Sylhet Mirror](https://sylhetmirror.com/?p=195754)
2. **Sailor.** Category: kids line of a general brand (family Eid 2026 collection includes kids; children's/newborn party frocks covered in an undated piece). Website: online platform confirmed by press, but the exact domain was not confirmed by search (`www.sailor.clothing` was tried and blocked). Evidence of Google Ads: none found. Strength: Unverified. Evidence date: 2026 Eid. [TBS 2026](https://www.tbsnews.net/economy/corporates/sailor-eid-collection-2026-now-available-stores-and-online-1376516); [Sylhet Mirror – Junior's Eid Fashion (undated)](https://sylhetmirror.com/?p=180549)
3. **iNFINITY Mega Mall** (Richman/Infinity group, per the requester's grouping; ownership not confirmed here). Category: kids section of a general fashion retailer. Website: not confirmed. Evidence of Google Ads: none found. Strength: Unverified. Evidence date: 2026 Eid. [Daily Star](https://www.thedailystar.net/lifestyle/news/eid-collection-2026-celebrate-elevated-elegance-infinity-mega-mall-4124331)
4. **Bata (Bangladesh): kids footwear.** Category: kids line of a general (footwear) brand. Website: Bata Bangladesh domain not confirmed in this session. Evidence of Google Ads: only the Bata **India** (bata.in) AdSpyder estimate, which does not apply to the BD entity. Strength: Unverified (weak group-level hint). Evidence date: snippet undated. [AdSpyder – bata.in](https://adspyder.io/domain-paid-ad-analysis/bata.in); [Daily Star – Bata Eid collection](https://online-d11.thedailystar.net/business/organisation-news/press-releases/news/bata-launches-eid-footwear-collection-over-2000-styles-4121471)
5. **Apex Footwear: kids footwear (Twinkler line).** Category: kids line of a general (footwear) brand. Website: not confirmed. Evidence of Google Ads: none; the Nov 2024 Children's Day campaign was static print/social design. Strength: Unverified. Evidence date: Nov 2024. [Ads of the World](https://www.adsoftheworld.com/campaigns/happy-children-s-day-twinkler-by-apex-footwear)
6. **Aarong** (BRAC). Category: kids section of a general lifestyle brand. TBS cites Aarong among local brands offering "a perfect blend of tradition and convenience" in kids' wear. Website: aarong.com (homepage fetch blocked). Evidence of Google Ads: none found. Strength: Unverified. [TBS – Mini fashionistas](https://www.tbsnews.net/features/mode/mini-fashionistas-evolution-childrens-wardrobe-1107756); [Aarong – Wikipedia](https://en.wikipedia.org/wiki/Aarong)
7. **Yellow** (Beximco). Category: general apparel retailer; a kids line was not confirmed in this session. Website: yellowclothing.net was tried (blocked); the domain is not confirmed by search. Evidence of Google Ads: none found. Strength: Unverified. [Yellow (clothing) – Wikipedia](https://en.wikipedia.org/wiki/Yellow_(clothing))
8. **SaRa Lifestyle.** Category: kids line of a general brand ("Persian Tale" Eid collection had kids lines). Date not confirmed; may be pre-2024, so possibly outdated. Evidence of Google Ads: none found. Strength: Unverified. [Dhaka Tribune](https://www.dhakatribune.com/amp/business/375761/sara-unveils-exclusive-eid-collection-with-theme)
9. **Rang Bangladesh: Rang Junior.** Category: kids line of a general brand, sold in showrooms. Older article, pre-2024, possibly outdated. Evidence of Google Ads: none found. Strength: Unverified. [Daily Star](https://www.thedailystar.net/node/1321732)

*Tier 2: dedicated kids/baby-wear brands with their own web store (best-fit leads)*

10. **Clothxtra.** Dedicated baby and kids clothing, made in Dhaka, newborn to 16 years, with Baby / Toddler / Kids sections. Website: clothxtra.com. City: Dhaka. Google Ads: none found. Strength: Unverified. [clothxtra.com](https://clothxtra.com/)
11. **PTex** (ptexfashion.com). Dedicated cotton infant and kids clothing, newborn (0–3 m) to 5–12 years, ships to all 64 districts. Google Ads: none found. Strength: Unverified. [PTex – Baby Shop Bangladesh](https://ptexfashion.com/collections/baby-shop-bangladesh)
12. **Trends Kids** (trends-kids.com). Dedicated baby and kids clothing, Ashkona (Dhaka) address, and the site claims "10,000+ customers" (self-reported). Google Ads: none found. Strength: Unverified. [trends-kids.com](https://trends-kids.com/)
13. **Yusha** (yusha.com.bd). Baby clothing brand selling its own-design baby clothes, partly imported. City not confirmed. Google Ads: none found. Strength: Unverified. [Yusha – About](https://yusha.com.bd/about)
14. **Honesty MRT.** Premium baby and kids clothing at affordable prices, with nationwide cash on delivery. The store is hosted on the zatiqeasy store-builder (subdomain, not an own domain). Google Ads: none found. Strength: Unverified. [Honesty MRT – About](https://honestymrt.zatiqeasy.com/about-us)
15. **Duronto Kids.** Kid clothing brand, 18 months to 12 years, Uttara (Dhaka) address. Source is a business directory listing only; own website not confirmed. Google Ads: none found. Strength: Unverified. [Bangladesh Business Directory – Kids](https://bangladeshbusinessdir.com/shopping/kids/)

*Tier 3: dedicated kids-wear brands that appear mainly offline or social-first (Google Ads least likely)*

16. **Shoishob.** Kids apparel brand since 2008, mixing contemporary and ethnic styles, with 40+ stores across Bangladesh (per a Daily Star page in the search results; the article date is not shown). Website not confirmed. Google Ads: none found. Strength: Unverified. [Daily Star](https://images.thedailystar.net/node/3547691)
17. **Lullabys.** 100% organic-cotton casual wear for newborns to 8-year-olds, all materials sourced in Bangladesh, store in Banani (Dhaka), Facebook page referenced. Article from April 2022, pre-2024, possibly outdated. Google Ads: none found. Strength: Unverified. [Daily Star – Children's clothes from Lullabys](https://www.thedailystar.net/life-living/news/childrens-clothes-lullabys-3011946)
18. **Double Rainbow.** Local baby-clothing brand, with a shop at Shimanto Shambhar (Dhanmondi 2, Dhaka) and also sold via social media and Unimart outlets. Article date not shown and likely older, so possibly outdated. Google Ads: none found. Strength: Unverified. [ICE Today – Baby brand promises global quality](https://icetoday.net/?p=36656)
19. **Periwinkle.** Second outlet opened 1 July 2022 at ABC Tradeplex, Dhanmondi, in partnership with Step Footwear. It turned up in a kids-wear search, but the article snippet does not confirm a kids-only range, so the category is uncertain. Pre-2024, possibly outdated. Google Ads: none found. Strength: Unverified. [Daily Star](https://online-d11.thedailystar.net/business/organisation-news/news/second-outlet-periwinkle-was-inaugurated-dhanmondi-3064556)
20. **Kids Sunnah Store.** Modest wear for boys (panjabis, kurtas), about Tk 300–5,000, sold via Rokomari. Own website not confirmed. Google Ads: none found. Strength: Unverified. [Rokomari brand page](https://www.rokomari.com/brand/17782/kids-sunnah-store)
21. **Little Angels** (@LittleAngelsBD). Dhaka retail shop for baby and kids products, Facebook page. Google Ads: none found. Strength: Unverified. [Facebook – Little Angels](https://www.facebook.com/LittleAngelsBD/)
22. **Shishu.** A brand named after a rescued cat ("the country's first CEO Cat") that opened its first physical clothing store at Bashundhara City. Whether it is kids-only is **not confirmed** (an earlier search summary called it a children's brand; the headline does not). Google Ads: none found. Strength: Unverified. [Daily Star](https://d11.thedailystar.net/lifestyle/news/shishu-countrys-first-ceo-cat-launches-clothing-store-3792441)

*Marketplaces and general shops with kids sections (not brands, listed for completeness)*
- **Othoba.com** has a kids-fashion section (toddlers to pre-teens) with cash on delivery. [Othoba – Kids fashion](https://othoba.com/kids-fashions)
- **Monowamart** is a baby shop selling baby dresses alongside feeding, diapers and toys. [Monowamart](https://monowamart.com/category/clothes?close=false)

### Inferences
- The most useful leads for a kids-wear Google Ads pitch are Tier 2: Clothxtra, PTex, Trends Kids and Yusha. They have their own domains (so Google Ads conversion tracking is possible) and serve customers nationwide. Honesty MRT is on a hosted subdomain, and Duronto Kids has only a directory listing, which makes them less likely to have proper Google Ads tracking.
- Tier 1 brands are the likeliest *current* Google advertisers. They are also likely to already work with agencies, so they are less "open" as leads.
- Several Tier 3 sources are from 2022 or undated (Lullabys, Periwinkle, Double Rainbow, Shoishob, Rang, SaRa). Check that these businesses are still active before using them as leads.

### Gaps
- Facebook page URLs were not found for most businesses (only Little Angels, plus a general "Baby clothes bd" page whose business details are unknown: [Facebook – Baby clothes bd](https://www.facebook.com/babyclothsbd/)).
- Own-website domains for Sailor, Yellow, Bata Bangladesh, Apex, SaRa, Ecstasy, Richman/Infinity and Shoishob were not confirmed by search in this session. Tried-but-blocked domains are listed above as unconfirmed.
- "Al Qaswa Kids" (Eid-ul-Adha 2026 girls' collection) turned up in search, but its country is not confirmed, so it is excluded. [Blog post](https://joliejaunty.blogspot.com/2026/05/al-qaswa-kids-unveils-enchanting-eid-ul.html)
- Neither the target of 10–25 *Google-verified* advertisers nor any "Verified" or "Strong indirect" rating could be reached without network access to adstransparency.google.com and the brand domains.
