# SOURCE_COMPATIBILITY_REPORT

Tested 2026-09-20 with a stable `KPOPPickMonitor/1.0` user agent and ordinary public `fetch`/HTTP requests. No login, hidden API, proxy, stealth, or access-control bypass was used.

| Source | URL | HTTP | Content type | Size | Business fields in response | Result |
|---|---|---:|---|---:|---|---|
| K-Pop Calendar | `https://kpopcal.com/api/events.json` | 200 | `application/json` | 236,393 bytes | artist, title, date, source, confirmed | `FETCH_OK` |
| Ktown4u | `https://www.ktown4u.com/goodsList?grp_no=107931&productType=newgoods&mainReleaseType=new` | 200 | `text/html` | client-rendered | product cards/prices are not present as a usable server-rendered list | `BROWSER_REQUIRED` |
| Weverse Shop | `https://shop.weverse.io/en/home` | 200 | `text/html` | 131,059 bytes | UI translations/config are present; usable product list/prices are not | `BROWSER_REQUIRED` |
| Domestic store | no accurately verifiable public URL found for 星河/液体猫/Pinky | n/a | n/a | n/a | not tested against a guessed URL | `NOT_CONFIGURED` |

No 403, 429, CAPTCHA, login wall, or 5xx response occurred in these tests. Ktown4u and Weverse stay disabled in scheduled monitoring until a short Cloudflare Browser Rendering compatibility run confirms stable public product fields. Domestic-store monitoring stays disabled and falls back to the existing “添加购买信息” input.
