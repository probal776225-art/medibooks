# Bangladeshi kids / baby product businesses (non-clothing) that run Google Ads

Research date: 2026-10-31. Researcher scope: toys, baby care, diapers, baby food, feeding, gear, school items (NOT clothing).

**Important access limitation (read first).** This session's network policy blocked every direct check that could have verified Google Ads activity:
- `adstransparency.google.com` (the Google Ads Transparency Center): blocked. Plain HTTP (curl, including the RPC endpoints such as `/anji/_/rpc/SearchService/SearchSuggestions`) was refused at the proxy with "CONNECT tunnel failed, response 403". WebFetch failed with "getaddrinfo ENOTFOUND adstransparency.google.com" (session network allowlist).
- The shops' own websites (needed to look for `AW-` conversion IDs, `googleadservices.com`, or remarketing tags in the HTML): also blocked. curl to `babyshoppers.com.bd`, `www.babycare.com.bd` and even `www.google.com` got the same proxy 403, and WebFetch to `babycare.com.bd` gave ENOTFOUND.
- Only the web search tool worked. Search engines do not index Transparency Center results or page scripts, so **no business could be marked Verified or Strong indirect**. To check these, someone has to add `adstransparency.google.com` and the shop domains to the session's allowed domains (environment settings → Network access), or open the URLs in the checklist below in a normal browser.

## Key Question 1: Which Bangladeshi baby/kids product shops and brands appear as advertisers in the Google Ads Transparency Center (region BD)?

### Takeaway
This could not be answered: the Transparency Center was unreachable from this session (proxy 403 / DNS blocked), and no search result exposed a Transparency Center advertiser page for any Bangladeshi baby or toy business. Below is a sourced list of real Bangladeshi kids/baby product businesses (candidate leads). All are **Unverified** for Google Ads until someone checks each domain in the Transparency Center.

### Cited Findings
- Search results did not return any Transparency Center advertiser listing for baby products, toys or Bangladesh. They returned only third-party scraper tools, which say the Center can be searched by brand keyword, domain or advertiser ID, with a region filter; advertiser IDs look like "AR" plus digits at the end of the advertiser URL — [Apify: Google Ads Transparency scraper examples](https://apify.com/automation-lab/google-ads-transparency-center-scraper/examples/google-ads-transparency-advertiser-suggestions.md); [Apify: track advertiser by URL](https://apify.com/automly/google-ads-transparency-scraper/examples/track-google-advertiser-by-url.md)
- TheirStack has a page "Companies that use Google Ads in Bangladesh" (a technology-detection list). The rows visible in search showed only software, healthcare and IT-services companies, with no toy or baby retailers visible (full list needs their tool/download) — [TheirStack: Google Ads in Bangladesh](https://theirstack.com/en/technology/google-ads/bd)
- StoreLeads publishes per-country "Google Ads Pixel" store reports (e.g. India, Pakistan), but a Bangladesh Google Ads Pixel page did not come up in search. Its Bangladesh TikTok Pixel report lists 1,047 ecommerce stores (updated 2025-12-19), 51.3% on WooCommerce — showing that per-store pixel data for BD exists in that tool — [StoreLeads: TikTok Pixel, Bangladesh](https://storeleads.app/reports/technology/TikTok%20Pixel/country/BD); [StoreLeads: Google Ads Pixel, Pakistan (URL pattern)](https://storeleads.app/reports/technology/Google%20Ads%20Pixel/country/PK)

#### Candidate list — real Bangladeshi kids/baby product businesses (Google Ads status: all Unverified)
Ranked by how established they look (size, press coverage), since no Google Ads evidence could be gathered. "Evidence date" is the date of the source that shows the business exists.

| # | Business | Website / domain | Category | City | Google Ads evidence | Strength | Evidence date | Source |
|---|---|---|---|---|---|---|---|---|
| 1 | RFL eShop (PRAN-RFL group) — toys section; home of the Jim & Jolly toy brand | rfleshop.com | Toys & games (large manufacturer's own shop) | Not confirmed (group is Dhaka-based; not in source) | None found (site blocked) | Unverified | undated listing | [RFL eShop toys](https://rfleshop.com/toys-in-bangladesh) |
| 2 | Jim & Jolly Toys (RFL-linked, made in Bangladesh) | sold via rfleshop.com, rokomari.com | Toys: rockers, baby walkers, ride-ons, push toys | Not confirmed | None found | Unverified | Dec 2025 | [Dhaka Post](https://en.dhakapost.com/economy/2522); [Rokomari listing](https://www.rokomari.com/product/277882/jim-and-jolly-rock-rider-with-backrest-3y-pink) |
| 3 | Babycare.com (named "Babycare.com"; the .com.bd domain could not be checked) | Babycare.com (exact domain unconfirmed) | Baby products incl. food and diapers; founded 2012 | Not confirmed | None found | Unverified | 2021 (outdated) | [UNB](https://unb.com.bd/category/business/top-baby-products-based-ecommerce-sites-in-bangladesh/70501) |
| 4 | Baby Shoppers | babyshoppers.com.bd | Toys, food, diapers, skincare, mother's care | Dhaka likely (COD inside Dhaka; partial/full prepayment outside) | None found | Unverified | 2021 (outdated) | [UNB](https://unb.com.bd/category/business/top-baby-products-based-ecommerce-sites-in-bangladesh/70501) |
| 5 | BD Baby Mart | not found in sources | Imported baby products, "over 100 foreign brands" | Delivers inside/outside Dhaka | None found | Unverified | 2021 (outdated) | [UNB](https://unb.com.bd/category/business/top-baby-products-based-ecommerce-sites-in-bangladesh/70501) |
| 6 | Baby Mall BD | babymall.com.bd | Educational toys brand with own online store | Not confirmed | A digital marketer's portfolio lists Baby Mall BD as a case study, but the page names no channel, metrics or Google Ads work | Weak (marketing case study, channel unknown) | undated | [Sadekur Rahman case study page](https://sites.google.com/view/sadekur-rahman/case-studies/baby-mall-bd) |
| 7 | Goofi World (Goofi, by Light of Hope Ltd) | goofiworld.com | Learning toys, flash cards, back-to-school items | Not confirmed | None found | Unverified | 2019 (outdated) + live site pages | [Future Startup 2019-09-11](https://futurestartup.com/2019/09/11/goofi-from-light-of-hope-ltd/); [goofiworld.com](https://goofiworld.com/product/bangla-and-english-flash-cards) |
| 8 | Chalkpencil | chalkpencil.com | Art & craft, brain-development toys, STEAM kits | Not confirmed | None found | Unverified | 2022 (outdated) | [Future Startup 2022-04-11](https://futurestartup.com/2022/04/11/chalkpencil-raises-pre-seed-investment/) |
| 9 | Bitsy | not found in sources | Children's toy shop (started 2020 as a physical shop) | Not confirmed | None found | Unverified | date not shown (likely pre-2024) | [TBS News](https://www.tbsnews.net/features/brands/bitsy-toys-spark-your-childs-inner-creativity-434026) |
| 10 | Mindspark | not found in sources | Montessori-method toys, online | Not confirmed | None found | Unverified | undated | [TBS Graduates "Smart play"](https://tbsgraduates.net/?p=13260) |
| 11 | Lokkhisona | lokkhisona.com | Educational-play online toy store | Not confirmed | None found | Unverified | undated | [TBS Graduates "Smart play"](https://tbsgraduates.net/?p=13260) |
| 12 | Paklubi | paklubi.com | Toys, baby products, kids' accessories | Not confirmed | None found | Unverified | undated | [Brandfetch: paklubi.com](https://brandfetch.com/paklubi.com.md) |
| 13 | Toy House | toyhouseltd.com | Toys, ride-on vehicles, baby care | Not confirmed | None found; domain registered 2025-12-01 and flagged "Caution Advised" by an automated scam scanner | Unverified (and caution) | 2025-12 | [URLert: toyhouseltd.com](https://www.urlert.com/domains/toyhouseltd.com) |
| 14 | Kidz21 | kidz21.com | Plastic-free, sustainable toys made in Bangladesh | Not confirmed | None found | Unverified | undated | [Kidz21 mission page](https://mail.kidz21.com/our-mission) |

Also named as Bangladeshi online toy stores focused on educational play, with no other details found: Books for Kids, Tos Fun, Ayaat's — [TBS Graduates "Smart play"](https://tbsgraduates.net/?p=13260)

Lower priority (generalist e-commerce with kids/baby sections; outside the "specialist" focus): Othoba (baby personal care ~597 products; toys & games) — [Othoba](https://app.othoba.com/baby-personal-care); ePharma (baby & mom: Pampers, MamyPoko, Huggies, NeoCare diapers, formula; same-day Dhaka delivery) — [ePharma](https://epharma.com.bd/en/baby-mom/diapers?page=1); ULA (ride-on toys, tricycles, nationwide COD) — [ULA](https://www.ula.com.bd/category/kids-toys-kids-tricycle); Chaldal (toys; Dhaka, Chattogram, Jashore) — [Chaldal](https://chaldal.com/doraemon-car-z208-red-1-pcs).

#### Ready-to-use checklist for manual verification (open in a normal browser)
For each domain: `https://adstransparency.google.com/?region=BD&domain=<domain>` (e.g. `babyshoppers.com.bd`, `babymall.com.bd`, `goofiworld.com`, `chalkpencil.com`, `lokkhisona.com`, `paklubi.com`, `rfleshop.com`, `kidz21.com`, `toyhouseltd.com`). Then on each homepage use "View page source" and search for `AW-` (Google Ads conversion/remarketing ID) and `googleadservices.com`. An `AW-` ID = Strong indirect; ads listed in the Transparency Center with a recent "last shown" date = Verified.

### Inferences
- The candidate businesses are real and Bangladesh-based per the cited sources, but whether they advertise on Google is completely open. Do not present any of them as "Google advertisers" yet.
- Most published lists of BD baby shops are from 2021 (UNB); some shops on them may have closed or changed domains.

### Gaps
- Transparency Center results for every candidate (blocked by session network policy).
- Exact domain for "Babycare.com" (the .com.bd check failed because of the network block, not because the site is known not to exist).
- Websites for BD Baby Mart, Bitsy and Mindspark were not in any source.
- Facebook pages: none were found in search results for any candidate.
- City is unconfirmed for most candidates (sources do not state an address).
- A further name, "Nini Toys" (Dhaka, founded 2024, toys and anime collectibles), appeared only in a search-tool summary without a clearly attributable source page, so it is not in the table.

## Key Question 2: What other evidence (Google Shopping, conversion tags in HTML, agency case studies, job posts, news) shows these businesses use Google Ads?

### Takeaway
None found. HTML tag checks were impossible (sites blocked), and searches for agency case studies, freelancer portfolios and job posts turned up no Bangladeshi baby/toy business named as a Google Ads client or employer of a Google Ads role. The only marketing-related trace is an undated freelancer case study page for Baby Mall BD that does not name the ad channel.

### Cited Findings
- Baby Mall BD appears as a case study on a digital marketer's Google Sites portfolio; the page describes it as a Bangladeshi educational-toys brand and mentions its website (babymall.com.bd), but reports no metrics, no channel, and no Google Ads work — [Baby Mall BD case study](https://sites.google.com/view/sadekur-rahman/case-studies/baby-mall-bd)
- Searches for Google Ads case studies of baby-product stores returned only foreign examples (Romanian "Baby Needs" Shopping case, Mumzworld in the Middle East, Montessori Toddlers in the UK), none from Bangladesh — [Selltoro](https://selltoro.com/?p=4414); [Mumzworld case study](https://www.casestudies.com/company/google-marketing-platform/case-study/mumzworld-reaches-a-300-return-on-ad-spend-with-google-analytics); [Google: Montessori Toddlers](https://business.google.com/uk/resources/success-stories/montessoritoddlers/)
- Webskitters lists a case study titled "Webskitters Helped Luvlap Dominate the Market with Top-Notch Baby Products" (Luvlap is not shown to be Bangladeshi, and no Google Ads detail was visible) — [Webskitters](https://www.webskitters.com/?p=6466)
- Bangladeshi Google Ads job ads found in search were for non-baby companies (e.g. 10 Minute School "Google Ads Specialist"; a Smartech green energy Digital Marketing Manager role needing Google Ads and Meta Ads Manager); none were baby or toy shops — [Financial Express: 10 Minute School](https://old.thefinancialexpress.com.bd/public/print/10-minute-school-is-hiring-a-google-ads-specialist-1667911872); [Terra.do / Bdjobs listing](https://www.terra.do/climate-jobs/job-board/digital-marketing-manager-performance-marketing-expert-for-smartech-green-energy-job-id-1472067-8386955)
- Many Bangladesh-based freelancers sell Google Ads, Shopping and Performance Max setup on Fiverr/Upwork, but none of the listings found name a Bangladeshi baby or toy client — [Fiverr: Shopping ads seller](https://fiverr.com/touhid_ads/setup-and-manage-google-shopping-ads); [Clutch: PPC agencies in Bangladesh](https://clutch.co/bd/agencies/ppc/google-adwords)

### Inferences
- In Bangladesh, small kids/baby shops seem to rely mainly on Facebook/Meta (the StoreLeads BD TikTok-pixel count shows ad-pixel adoption among BD stores, but there is no comparable BD Google Ads figure in the sources). This is an inference, not a finding — no source compared Google vs Meta spend for BD baby shops.
- The fastest way to get real evidence is the manual checklist above (Transparency Center by domain, plus "View source" for `AW-`).

### Gaps
- `AW-` conversion IDs / `googleadservices.com` / remarketing tags: not checked for any site (blocked).
- Google Shopping listings from BD baby/toy shops: not checkable via search.
- No bdjobs/LinkedIn post from a baby/toy shop asking for a "Google Ads executive" was found.

## Key Question 3: Which of them are the biggest / most active?

### Takeaway
On Google Ads activity: unknown (no data). On general size and visibility: the RFL group's shop and its Jim & Jolly toy brand (backed by a large manufacturer, recent Dec 2025 press), and the long-running baby e-shops named by UNB (Babycare.com since 2012, Baby Shoppers, BD Baby Mart) look the most established; educational-toy players (Goofi World, Chalkpencil) have press/funding coverage but it is older than 2024.

### Cited Findings
- Jim & Jolly is described (Dec 2025) as a homegrown brand aiming to be a household name in Bangladesh, with rockers and baby walkers; its products are sold on Rokomari and RFL's shop and listed as made in Bangladesh — [Dhaka Post](https://en.dhakapost.com/economy/2522); [Rokomari](https://www.rokomari.com/product/277801/jim-and-jolly-zizo-truck-21cm-light-blue-918080); [RFL brain-boosting toys](https://rflbd.com/product/1-year-+/brain-boosting-toys)
- Babycare.com was called "one of the premier baby product shops in Bangladesh", founded 2012; Baby Shoppers "a pioneering e-commerce site for baby products"; BD Baby Mart works with "over 100 foreign brands" (2021 article — possibly outdated) — [UNB](https://unb.com.bd/category/business/top-baby-products-based-ecommerce-sites-in-bangladesh/70501)
- Chalkpencil raised pre-seed investment in April 2022 and sells art & craft, brain-development toys and STEAM kits — [Future Startup](https://futurestartup.com/2022/04/11/chalkpencil-raises-pre-seed-investment/)
- Goofi (Light of Hope Ltd) is a learning-toy brand/publisher; a Chaldal listing claims the series is used in many schools' curricula in Bangladesh (retailer claim, not independently confirmed) — [Future Startup 2019](https://futurestartup.com/2019/09/11/goofi-from-light-of-hope-ltd/); [Chaldal listing](https://chaldal.com/goofi-play-with-alphabet-1-pcs)
- The educational-toy market is described as small in Bangladesh "due to limited awareness" — [TBS Graduates](https://tbsgraduates.net/?p=13260)

### Inferences
- If any of these run Google Ads, the likeliest are the bigger, website-first sellers (RFL eShop, Babycare.com, Baby Shoppers, Goofi World, Chalkpencil), because they have full ecommerce sites to send ad traffic to. This is a guess for prioritising the manual check, not evidence.

### Gaps
- No traffic, revenue or ad-spend figures were found for any specialist BD kids/baby business.
- No 2024–2026 ranking of Bangladeshi baby shops was found; the main list (UNB) is from 2021.
