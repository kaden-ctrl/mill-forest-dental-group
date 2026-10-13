# Performance and Verification

Every number in the handoff report comes from a command in this file. Never report a
score you did not measure.

## Targets

| Metric | Target | Measured by |
|---|---|---|
| Lighthouse Performance | 90+ | `lighthouse`, mobile preset |
| Lighthouse Accessibility | 95+ | `lighthouse` |
| Lighthouse SEO | 100 | `lighthouse` |
| LCP | under 2.5s | `lighthouse` |
| CLS | under 0.1 | `lighthouse` |
| INP | under 200ms | field data, or TBT as a proxy in lab |
| Total page weight | under 1.5MB | `curl` sum, or devtools network panel |

## Running Lighthouse

```bash
# Mobile is the default and the one that matters. Do not report desktop numbers alone.
npx lighthouse https://{{DOMAIN}} \
  --output=html --output=json \
  --output-path=./lighthouse-mobile \
  --chrome-flags="--headless" \
  --quiet

# Pull the scores out of the JSON
node -e '
const r = require("./lighthouse-mobile.report.json");
const c = r.categories;
console.log("Performance   ", Math.round(c.performance.score*100));
console.log("Accessibility ", Math.round(c.accessibility.score*100));
console.log("Best Practices", Math.round(c["best-practices"].score*100));
console.log("SEO           ", Math.round(c.seo.score*100));
const a = r.audits;
console.log("LCP           ", a["largest-contentful-paint"].displayValue);
console.log("CLS           ", a["cumulative-layout-shift"].displayValue);
console.log("TBT           ", a["total-blocking-time"].displayValue);
'
```

Run it three times and report the median. Single runs vary by several points.

## Images

```bash
# Find every image over 200KB. These are the problem.
find . -path ./node_modules -prune -o \
  \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -print \
  | xargs -I{} du -k {} | sort -rn | awk '$1 > 200 {print $1"KB  "$2}'

# Convert to WebP at quality 82, which is visually lossless for photographs
for f in *.jpg *.jpeg *.png; do
  [ -e "$f" ] || continue
  cwebp -q 82 "$f" -o "${f%.*}.webp"
done

# Or with ImageMagick
magick input.jpg -quality 82 -resize 1600x output.webp

# Confirm the saving
du -sh originals/ webp/
```

Markup requirements. Explicit dimensions prevent layout shift, which is most of a bad
CLS score.

```html
<!-- Hero image: eager, high priority, preloaded in head -->
<img src="/hero.webp" alt="{{DESCRIPTION}}" width="1600" height="900"
     loading="eager" fetchpriority="high" decoding="async">

<!-- Everything below the fold -->
<img src="/service.webp" alt="{{DESCRIPTION}}" width="800" height="600"
     loading="lazy" decoding="async">

<!-- Responsive, for anything spanning breakpoints -->
<img src="/hero-1600.webp"
     srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
     sizes="(max-width: 768px) 100vw, 1200px"
     alt="{{DESCRIPTION}}" width="1600" height="900" loading="eager">
```

Find images missing dimensions:

```bash
grep -rn '<img' --include="*.html" --include="*.tsx" --include="*.jsx" . \
  | grep -v node_modules | grep -v 'width=' 
```

## Fonts

Maximum two families. Self-host. Subset to the characters actually used.

```css
@font-face {
  font-family: 'BrandSans';
  src: url('/fonts/brandsans-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  font-style: normal;
}
```

```html
<link rel="preload" href="/fonts/brandsans-400.woff2" as="font" type="font/woff2" crossorigin>
```

```bash
# Subset to latin only, usually a 60 to 70 percent size reduction
pip install fonttools brotli
pyftsubset brandsans.ttf \
  --unicodes="U+0000-00FF,U+2018-201A,U+201C-201E,U+2026,U+20AC" \
  --layout-features="kern,liga" \
  --flavor=woff2 \
  --output-file=brandsans-400.woff2

ls -lh brandsans.ttf brandsans-400.woff2
```

Count how many font files ship. More than four across two families means weights are
being loaded that nothing uses.

```bash
find . -name "*.woff2" -not -path "./node_modules/*" | wc -l
```

## Page weight

```bash
# Total transfer size of the home page and its subresources
npx lighthouse https://{{DOMAIN}} --output=json --output-path=./lh.json --quiet \
  --chrome-flags="--headless"
node -e '
const r = require("./lh.json");
const items = r.audits["network-requests"].details.items;
const total = items.reduce((s,i)=>s+(i.transferSize||0),0);
console.log("Total transfer:", (total/1024/1024).toFixed(2), "MB over", items.length, "requests");
const sorted = items.sort((a,b)=>(b.transferSize||0)-(a.transferSize||0)).slice(0,10);
sorted.forEach(i=>console.log(((i.transferSize||0)/1024).toFixed(0)+"KB", i.url.slice(0,90)));
'
```

## Unused CSS

```bash
npx purgecss --css dist/styles.css --content "dist/**/*.html" "dist/**/*.js" \
  --output dist/purged/
ls -lh dist/styles.css dist/purged/styles.css
```

## Broken links

```bash
# Crawl the whole live site, internal and external
npx linkinator https://{{DOMAIN}} --recurse --skip "linkedin.com|twitter.com|x.com"

# Internal only, which is where real breakage lives
npx linkinator https://{{DOMAIN}} --recurse --skip "^(?!https://{{DOMAIN}})"
```

Every broken link must be fixed or removed before launch. Check the footer
specifically, since that is where dead links survive longest.

Verify mailto and tel links are correct, not just present:

```bash
grep -rhno 'href="mailto:[^"]*"' --include="*.html" --include="*.tsx" . \
  | grep -v node_modules | sort -u
grep -rhno 'href="tel:[^"]*"' --include="*.html" --include="*.tsx" . \
  | grep -v node_modules | sort -u
```

`tel:` values must be digits with an optional leading plus. `tel:(520) 555-0100` fails
on some Android dialers. Use `tel:+15205550100`.

External links need `rel`:

```bash
grep -rn 'target="_blank"' --include="*.html" --include="*.tsx" . \
  | grep -v node_modules | grep -v 'rel=' 
```

## Analytics verification

Installing the snippet is not verification. Confirm events arrive.

1. Open the live site in a private window.
2. In GA4, open Reports, then Realtime. Confirm your own visit appears within 30
   seconds.
3. Submit the contact form. Confirm the conversion event appears in Realtime.
4. Click the primary CTA. Confirm the event appears.

```bash
# Confirm the tag is actually on every page, not just the home page
for p in "" services about contact faq privacy terms; do
  printf "%s " "$p"
  curl -s "https://{{DOMAIN}}/$p" | grep -c "G-{{MEASUREMENT_ID}}"
done
```

Every page must return 1 or more. A 0 means the tag is missing from that template.

Analytics must not fire before consent where consent is required:

```bash
# With no consent cookie, the GA request should not be made.
# Verify in devtools Network, filtered to "collect", on a fresh private window.
```

Load it without blocking render:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-{{MEASUREMENT_ID}}"></script>
```

Install only what the client asked for. Do not add a second analytics product, a
heatmap tool, or a pixel on your own initiative.

## Console errors

Zero errors on every page. Check each one, not just the home page.

```js
// Paste in the console, then navigate the site
window.__errs = [];
window.addEventListener('error', e => window.__errs.push(e.message));
window.addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason)));
// Later:
console.table(window.__errs);
```

## HTML validation

```bash
npx html-validate "dist/**/*.html"
```

Or paste the live URL into https://validator.w3.org/nu/

## Full pre-launch sweep

Run these in order. Record each result for the handoff report.

```bash
D={{DOMAIN}}

echo "== redirects =="
curl -sIL http://$D | grep -E "^(HTTP|location:)"
curl -sIL https://www.$D | grep -E "^(HTTP|location:)"

echo "== security headers =="
curl -sI https://$D | grep -iE "strict-transport|x-content-type|x-frame|referrer-policy"

echo "== root files =="
for f in robots.txt sitemap.xml favicon.ico favicon.svg apple-touch-icon.png site.webmanifest; do
  printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' https://$D/$f)" "$f"
done

echo "== 404 returns 404 =="
curl -so /dev/null -w "%{http_code}\n" https://$D/definitely-not-a-real-page

echo "== sitemap URLs all 200 =="
curl -s https://$D/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | while read -r u; do printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' "$u")" "$u"; done

echo "== broken links =="
npx linkinator https://$D --recurse

echo "== accessibility =="
npx pa11y https://$D --standard WCAG2AA

echo "== lighthouse =="
npx lighthouse https://$D --output=json --output-path=./lh.json --quiet --chrome-flags="--headless"
node -e 'const c=require("./lh.json").categories;for(const k in c)console.log(k,Math.round(c[k].score*100))'
```
