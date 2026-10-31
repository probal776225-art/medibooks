# Online-first / small-to-medium Bangladeshi fashion e-commerce shops: Google Ads evidence

Research date: 2026-10-31. Researcher scope: smaller, web-based BD fashion sellers with their own domain (big outlet brands such as Aarong, Yellow, Ecstasy, Sailor, Lubnan, Richman, Le Reve are covered by another researcher and left out here).

**Read this first: how strong the evidence is.** This session's network policy blocked every direct site check:
- `adstransparency.google.com` was refused by the egress proxy (curl: `CONNECT tunnel failed, response 403`), and WebFetch could not resolve it (`getaddrinfo ENOTFOUND`). So the Google Ads Transparency Center (web UI and RPC endpoints) **could not be queried at all**.
- The shop homepages (tested: `fabrilife.com`, `kurtiistic.com`) were blocked the same way, by both curl and WebFetch. So **no homepage HTML could be scanned** for `AW-` conversion IDs, `googleadservices.com`, `gtag('config','AW-…')`, GTM containers or Merchant Center / "Google & YouTube" app markers.
- What did work was the web search tool (US-based index; it gives summaries of results, not the full pages). Everything below comes from those results.
- **Result: no business below has Verified or Strong-indirect Google Ads evidence.** Every row is "Unverified" for Google Ads. The list is a set of real, own-domain BD fashion shops that show up for commercial shopping searches, ready for someone to check in the Ads Transparency Center and in the page source. To finish the job, `adstransparency.google.com` and the shop domains have to be added to the session's allowed network domains (cloud environment settings → Network access).

## Q1. Which online fashion shops show up for Google-style commercial queries ("three piece online shop bangladesh", "borka online bd", "panjabi online shop", "ladies dress price in bangladesh", "t shirt online bd") with their own domain?

### Takeaway
Generic commercial searches are dominated by marketplaces and classifieds (Othoba, Daraz, Bikroy, BDStall, Rokomari, Chaldal). Below them, about 28 own-domain BD fashion shops came up across women's three-piece/kurti, saree, borka/abaya/hijab, panjabi/men's wear and kids' wear. Seven of them are kids' clothing specialists. None has confirmed Google Ads activity (see Q2/Q3), so the ranking below is by strength of the "own-domain, online-first BD fashion seller" evidence, not by ad evidence.

### Cited Findings

**Marketplaces dominate the generic queries (not leads, context only)**
- "three piece online shop bangladesh" returned Othoba (salwar-kameez / three-piece category), Daraz, Bikroy classified listings (about BDT 800–1,600), BDStall, plus one own-domain brand, Kurtiistic — [Othoba three-piece](https://othoba.com/salwar-kameez-3); [Bikroy SS Online Shop](https://bikroy.com/bn/shop/ss-online-shop); [Kurtiistic product](https://kurtiistic.com/product/kurtiistic-valentinbe-three-pieces-3zm9s-oand1-yjof5-e1zcb-e5a36-three-pieces-set)
- "borka online shop bd" returned only marketplaces (Othoba burqa ৳650–950, Daraz, BDStall, Bikroy). No own-domain borka shop ranked for that wording — [Othoba burqa](https://othoba.com/burqa); [Bikroy borka](https://bikroy.com/25-borka/topshop)
- "panjabi online shop bangladesh price" returned Othoba, Rokomari, BDStall (July 2026 category page) and Chaldal (Fabric Lagbe panjabi ৳860) — [BDStall panjabi](https://www.bdstall.com/clothing/panjabi/); [Chaldal](https://chaldal.com/fabric-lagbe-gents-panjabi-s-gp-1-1-pcs)
- "t shirt online shop bd" returned Othoba, Rokomari (Pathok Point brand), a Daily Star piece on "Fine Threads" (undated, may be old) and Bikroy — [Othoba kids tees](https://othoba.com/t-shirts-4); [Daily Star – Fine Threads](https://www.thedailystar.net/node/1484047)

**Market size context**
- Storeleads counts 3,849 Shopify stores in Bangladesh, and about 38.3% of them sell apparel. In Dhaka there are 2,066 live Shopify stores, 39.5% of them apparel. YouTube is used by 12.1% of BD Shopify stores (13.6% in Dhaka). Storeleads reports a 505% year-on-year rise in Dhaka store count in 2025 Q4. The pages are dated unevenly (national page updated recently; Dhaka page about 280 days old) — [Storeleads BD](https://storeleads.app/reports/shopify/BD/top-stores); [Storeleads Dhaka](https://storeleads.app/reports/shopify/BD/city/Dhaka)
- Semrush's March 2026 "most visited apparel & fashion websites in Bangladesh" lists threads.com (a social network, wrongly categorised), aarong.com, apex4u.com, batabd.com, stylevore.com, ilyn.global, fabrilife.com and lerevecraze.com — [Semrush BD apparel](https://www.semrush.com/trending-websites/bd/apparel-and-fashion)

**Candidate businesses (own domain, Bangladesh-based, found in search).** Facebook pages could not be confirmed in this session; the Facebook column says so. For every row: Google Ads evidence = none found; evidence strength = **Unverified**; checked 2026-10-31.

| # | Business | Website | Product focus | Kids? | Notes / source |
|---|---|---|---|---|---|
| 1 | Kurtiistic | kurtiistic.com | Women's three-piece sets and kurtis (ivory premium set ৳1,199–1,399; Eid set ৳1,499; Valentine's limited edition). Also sells through Facebook and other platforms. | Not seen | Ranked for "three piece online shop bangladesh" — [product page](https://kurtiistic.com/product/ivory-white-kurtiistic-premium-three-piece-set) |
| 2 | Smart Eshop BD | smarteshopbd.com | Kurtis from ৳799; three-piece sets ("Pakistani Inspired Three Piece" ৳1,450; "Digital Print Three Piece" ৳1,590). Price dates conflict, so prices may be stale. | Not seen | [three-piece](https://www.smarteshopbd.com/product/pakistani-inspired-three-piece-dress/); [kurti category](https://smarteshopbd.com/product-category/womens-clothing/round-dress/kurti/) |
| 3 | Seerat Ethnic | seeratethnic.com | Women's kurta sets ("Online Kurta Set for Women in Bangladesh") | Not seen | [collection](https://seeratethnic.com/collections/kurtas-bangladesh) |
| 4 | Chambray Fashion | chambrayfashion.com | Ladies' kurtis (one at ৳1,500) | Not seen | [product](https://chambrayfashion.com/product/kurti-dress/) |
| 5 | gFashion | gfashion.com.bd | Women's kurtis (one at ৳2,190) | Not seen | [product](https://gfashion.com.bd/product/womens-kurti-3/) |
| 6 | Dhaka Mart | dhakamart.fashion | Sarees (jamdani, katan), dresses, ethnic wear. Says it sells online and has outlets in Dhaka. | Not seen | [home](https://dhakamart.fashion/); [jamdani](https://dhakamart.fashion/category/jamdani-saree) |
| 7 | Noborupa | noborupa.com | Wedding sarees, jamdani and katan | Not seen | [page](https://www.noborupa.com/buy-wedding-saree-online-in-bangladesh-jamdani-katan-collection/) |
| 8 | Shareez | shareez.com.bd | Dhakai jamdani sarees. Advertises free delivery across BD and a return policy. | Not seen | [category](https://shareez.com.bd/product-category/jamdani-saree-silk-jamdani-cotton-jamdani/) |
| 9 | J A Gallery | jagallerybd.com | Jamdani, silk and katan sarees | Not seen | [saree category](https://jagallerybd.com/product-category/women/saree/) |
| 10 | Modest Collection | modestbd.com | Abayas, jilbabs, khimars, hijabs. Dhanmondi store; sizes to 3XL; nationwide delivery. Publishes its own SEO buying guide ("Best Abayas in Bangladesh 2026"). | Not seen | [home](https://www.modestbd.com/); [2026 guide](https://www.modestbd.com/blogs/hijab/best-abayas-bangladesh-2026) |
| 11 | Emaan | emaanbd.com | "Borkha brand in Bangladesh": embroidered and karchupi abayas | Not seen | [home](https://emaanbd.com/) |
| 12 | Ziarah | ziarahbd.com | Hijabs, niqabs, hijab gift boxes, some abayas. Dhaka; cash on delivery. | Not seen | [home](https://ziarahbd.com/) |
| 13 | Style Abaya (VelHaya) | styleabaya.com | "Luxury Dubai abaya", khimars, hijabs | Not seen | [home](https://styleabaya.com/) |
| 14 | Muslim Abaya | muslimabaya.com | Abayas and two-piece sets (৳550–2,500 in structured data); cash on delivery. **Flag:** the page showed a developer-style "local server" notice, so the site may be unfinished. | Not seen | [home](https://muslimabaya.com/) |
| 15 | Masculine | masculine.com.bd | Budget men's panjabis (kabli, printed, semi-fit) | Not seen | [panjabi](https://www.masculine.com.bd/collections/panjabi) |
| 16 | Dorjibari | dorjibari.com.bd | Men's panjabi and men's fashion. Founded 2006; has physical stores; free nationwide delivery and cash on delivery online. **Borderline:** mid-size with outlets. | Not seen | [home](https://dorjibari.com.bd/); [panjabi](https://dorjibari.com.bd/collections/panjabi) |
| 17 | Fabrilife | fabrilife.com | T-shirts, polos, casual wear. Started online as a printed-tee brand; now has outlets and an app. **Borderline:** it is in Semrush's top BD apparel sites (March 2026), so it is bigger than "less famous". | Unknown | [deshiz guide](https://deshiz.com/online-shopping-clothes-bangladesh/); [Semrush](https://www.semrush.com/trending-websites/bd/apparel-and-fashion) |
| 18 | PTex | ptexfashion.com | Pure-cotton infant and kids' wear, ages 0–12; nationwide delivery | **Yes (kids only)** | [Baby Shop collection](https://ptexfashion.com/collections/baby-shop-bangladesh) |
| 19 | Clothxtra | clothxtra.com | Baby and kids' clothes, newborn to 16. Founded 2022. Claims a valuation above BDT 10 million (self-reported). | **Yes (kids only)** | [home](https://clothxtra.com/) |
| 20 | Kiddleplace | kiddleplace.com | Kids' dresses and party wear: baby gowns, princess dresses | **Yes (kids dresses)** | [home](https://kiddleplace.com/) |
| 21 | Trends Kids | trends-kids.com | Discounted baby and kids' clothing, own-brand; says "10,000+ customers" (self-reported) | **Yes (kids only)** | [home](https://trends-kids.com/) |
| 22 | ChildrenGoods | childrengoods.com | Toddler and children's clothes "in Bangladesh" | **Yes (kids only)** | [home](https://childrengoods.com/) |
| 23 | Fine Babyhood | finebabyhood.com | Imported baby clothing plus toys and accessories | **Yes (baby)** | [home](https://finebabyhood.com/) |
| 24 | Monowamart | monowamart.com | Broad baby shop: clothing, feeding, diapers | **Yes (baby)** | [home](https://monowamart.com/); [clothes](https://monowamart.com/category/clothes?close=false) |
| 25 | Blucheez | blucheez.fashion | Panjabis and menswear. **Borderline:** an outlet brand. | Not seen | [panjabi](https://blucheez.fashion/collections/mens-panjabi) |
| 26 | Vibrant | vibrantbd.com | Panjabis; calls itself "a leading lifestyle brand". **Borderline:** an established brand. | Not seen | [panjabi](https://www.vibrantbd.com/collections/panjabi) |
| 27 | Stylish Abaya | stylishabaya.com | Abayas. Outlets in Banani, Bashundhara, Mirpur and Sylhet, plus Dubai. **Borderline:** physical chain. | Not seen | [home](https://www.stylishabaya.com/) |
| 28 | Tangail Saree Kutir | tskbd.com | Jamdani, katan and moslin sarees with an online cart; some jamdani over ৳100,000. **Borderline:** established outlet business. | Not seen | [home](https://tskbd.com/) |

- The kids search also returned a Facebook-only seller, "Little Angels" (@LittleAngelsBD). No own website was found, so it is out of scope for "own domain" — [Facebook](https://www.facebook.com/LittleAngelsBD/)
- The abaya search also returned EastEssence (eastessence.com) and VEILED (veiled.com). These are international, not BD-based, and are excluded — [EastEssence](https://eastessence.com/); [VEILED](https://veiled.com/)

### Inferences
- Rows 1–15 and 18–24 best fit "less famous, online-first, own domain". Rows 16–17 and 25–28 are mid-size or have outlets; keep them only if the user wants a wider net.
- Shops that publish SEO content aimed at commercial queries (for example Modest Collection's "Best Abayas in Bangladesh 2026" guide, and Masculine's "best price in Bangladesh" collection titles) are investing in Google acquisition. That makes them likelier Google Ads users, but it is **not** evidence of paid ads.
- Many smaller BD sellers seem to rank on marketplaces rather than on their own sites for the generic queries, which matches the F-commerce-heavy market. This is an inference from the search results only.
- The web search tool is US-based, so these rankings are not what a user in Dhaka would see, and the tool shows no paid (sponsored) results at all. A real Google.com.bd search from Bangladesh, with ads shown, is the right way to see who bids on these queries.

### Gaps
- Facebook page URLs for each shop were not found or confirmed; the shop sites could not be opened.
- Whether each shop sells kids' wear was judged from search summaries only ("Not seen" does not mean "No").
- No Bangla-language queries were run (e.g., "থ্রি পিস অনলাইন শপ"). Many small BD shops target Bangla queries.
- stylevore.com and ilyn.global appear in Semrush's BD apparel list, but what they sell and where they are based were not established, so they are not listed as leads.

## Q2. Which candidates appear in the Google Ads Transparency Center (region BD)?

### Takeaway
This could not be checked. The session's egress proxy refused `adstransparency.google.com` (and WebFetch could not resolve it), so neither the web UI nor the RPC endpoints (`/anji/_/rpc/SearchService/SearchSuggestions`, `/SearchCreatives`) could be reached. A search limited to that domain returned nothing (Transparency Center pages are not indexed by the search tool).

### Cited Findings
- Direct test from this session: `curl https://adstransparency.google.com/?region=BD` → `curl: (56) CONNECT tunnel failed, response 403`; WebFetch → `getaddrinfo ENOTFOUND adstransparency.google.com` (session network policy). No external source to cite; this is a first-hand tool result from 2026-10-31.
- A web search limited to `adstransparency.google.com` for "Fabrilife" returned no results — (no URL; empty result set)

### Inferences
- Nothing in these notes should be read as "this shop does or does not advertise on Google". Absence of evidence here comes from blocked tooling, not from the Transparency Center.

### Gaps
- For every one of the 28 candidates, the Ads Transparency Center check (by name and by domain, region BD, last 30 days and "all time") is still to be done. Next step: allow `adstransparency.google.com` in the session's network settings, then query `SearchSuggestions` with each domain, or check by hand at https://adstransparency.google.com/?region=BD.

## Q3. Do the candidates' homepages carry Google Ads tags (AW- conversion IDs, googleadservices.com, gtag AW- config, Merchant Center / "Google & YouTube" markers)?

### Takeaway
This could not be checked. The shop domains are outside the session's allowed network domains, so the HTML could not be downloaded or scanned. Third-party technology profiles (Storeleads app-install data) need a paid account. One useful side finding: **whether Google Shopping ads run in Bangladesh/BDT at all is disputed**. If they don't, BD fashion shops' Google spending would mostly be Search, Performance Max (without Shopping inventory), YouTube and Display, and Merchant Center markers would be weak signals.

### Cited Findings
- Test fetches of `https://fabrilife.com/` and `https://kurtiistic.com/` failed with `CONNECT tunnel failed, response 403` (curl) and `getaddrinfo ENOTFOUND` (WebFetch) on 2026-10-31. These are first-hand tool results; no external source.
- Storeleads reports YouTube use as a social-link metric, not as installs of the "Google & YouTube" Shopify app. App-install detail is behind a paid account — [Storeleads BD](https://storeleads.app/reports/shopify/BD/top-stores)
- Google's Merchant Center "regional availability and pricing" page lists Bangladesh among its countries — [Google Merchant Center Help](https://support.google.com/merchants/answer/16782229?hl=en); **contradicted by** a Bangla blog (about mid-October 2026) saying that Google's "Supported languages and currencies" page, checked September 2026, does not list Bangladesh/BDT for Shopping ads or free listings, and that some countries run Shopping as a limited beta — [eomsbd.com Merchant Center guide](https://eomsbd.com/google-marketing/google-merchant-center)
- Third-party feed guides say a BD feed should be priced in BDT and point to a Bangladeshi version of the store — [Glopal](https://merchants.glopal.com/en-gb/google-shopping/bangladesh); [ShoppingFeeder](https://www.shoppingfeeder.com/channels/global-google-product-search/?country=BD)

### Inferences
- If Shopping ads are not open to BD/BDT, then searching Google Shopping for these products from Bangladesh would show little, and the best signals become `AW-` conversion tags and Search/YouTube creatives in the Transparency Center. This depends on which of the two conflicting sources above is right.

### Gaps
- No `AW-`/`googleadservices`/GTM evidence for any candidate. A simple check (curl each homepage, then grep for `AW-\d+`, `googleadservices.com`, `GTM-…`, `G-…`, `google_conversion_id`) was tried. It never got any HTML back because of the network block, so it is untested against real pages. It needs the shop domains allowed in network settings.
- Bangladesh's Shopping-ads eligibility should be checked against Google's current "Supported languages and currencies" help page or inside a live Merchant Center account.

## Q4. Are there public lists, agency portfolios or case studies naming BD fashion e-commerce clients running Google Shopping/Search ads?

### Takeaway
No named BD fashion client was found. BD agencies and freelancers advertise Google Shopping, Search and Performance Max services for fashion e-commerce, but their case studies are anonymous and their results are self-reported.

### Cited Findings
- Ngital (Dhaka agency) publishes an **anonymised** fashion e-commerce example (Shopping ads starting at 1.8x ROAS) and a client testimonial of ROAS going from about 2x to 6x in four months. It lists fashion as a specialisation. No brand is named — [Ngital Google Ads](https://ngital.com/services/google-ads)
- A freelance Google Ads specialist says they manage Shopping, Search and PMax for Bangladesh e-commerce (and for garments/textile businesses). No client names — [sakilmahmud.com e-commerce](https://sakilmahmud.com/google-ads-for-ecommerce-bangladesh/); [sakilmahmud.com garments](https://sakilmahmud.com/google-ads-for-garments-bangladesh/)
- Digital Marketing Dhaka claims a 4.9x trailing-12-month average ROAS across accounts, with no client names or vertical breakdown — [digitalmarketingdhaka.com](https://digitalmarketingdhaka.com/)
- Beyond Bracket lists fashion among its portfolio industries (claim: "ROI ~2.5x industry standard"), with no named fashion Google Ads client in the results — [Beyond Bracket](https://beyondbracket.com/digital-marketing-company-bangladesh/)
- Agent Wise X publishes BD Google Ads guides (2025 and 2026) covering Search, Shopping and PMax; no named fashion advertisers seen in the results — [Agent Wise X 2026 guide](https://agentwisex.com/google-ads-bangladesh-complete-guide-2026/)
- Directory and listicle sources (not ad evidence) that name BD online clothing sellers: deshiz.com (Fabrilife, Aarong, Yellow, Easy Fashion, Kay Kraft, Daraz, Othoba), Notionhive (Cats Eye, Gentle Park, Richman, Sailor, Turaag Active…) and Beyond Bracket's "Top 55 e-commerce sites" — [deshiz](https://deshiz.com/online-shopping-clothes-bangladesh/); [Notionhive](https://notionhive.com/blog/ecommerce-sites-in-bangladesh); [Beyond Bracket](https://beyondbracket.com/e-commerce-sites-in-bangladesh/)
- No bdjobs.com listings came up for "Google Ads" roles at fashion e-commerce brands (that would be another indirect signal) — the search returned only non-BD job boards (no BD source found).

### Inferences
- Agencies keep fashion clients anonymous, so agency portfolios are unlikely to give named leads. Direct checks (Transparency Center plus page-source tags) are the practical route.
- Agency demand-side pages show that Google Shopping, Search and PMax for BD fashion is a marketed service in 2025–2026. That suggests some BD fashion sellers do buy Google ads, but it does not identify which ones.

### Gaps
- e-CAB member lists were not searched (no time left in the tool budget).
- No news articles were found about specific BD F-commerce fashion pages moving to their own website and running Google Ads.
- The Agent Wise X guides, Ngital's case-study page and the eomsbd article were seen only as search summaries, not read in full.
