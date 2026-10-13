# Head Tags

Copy this block into every page's `<head>`, then replace every `{{...}}` token. No
token may survive into production. Order matters: charset and viewport first.

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>{{PAGE_KEYWORD}} | {{BUSINESS_NAME}}</title>
<meta name="description" content="{{140_TO_155_CHARS}}">
<link rel="canonical" href="https://{{DOMAIN}}{{PATH}}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="{{BUSINESS_NAME}}">
<meta property="og:title" content="{{PAGE_TITLE}}">
<meta property="og:description" content="{{SAME_AS_META_DESCRIPTION}}">
<meta property="og:url" content="https://{{DOMAIN}}{{PATH}}">
<meta property="og:image" content="https://{{DOMAIN}}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{{WHAT_THE_IMAGE_SHOWS}}">

<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="{{BRAND_HEX}}">

<link rel="preload" href="/fonts/{{FONT_FILE}}.woff2" as="font" type="font/woff2" crossorigin>
```

Also set the language on the html element:

```html
<html lang="en">
```

## Title and description rules

| Field | Length | Format |
|---|---|---|
| `<title>` | 50 to 60 chars | `Primary Keyword \| Business Name` |
| `meta description` | 140 to 155 chars | What the page offers, plus the action |

Check every page's lengths before launch:

```bash
# Prints each page's title with its character count. Flags anything outside 50-60.
for f in $(find . -name "*.html" -not -path "./node_modules/*"); do
  t=$(grep -o '<title>[^<]*</title>' "$f" | sed 's/<[^>]*>//g')
  n=${#t}
  flag=""; [ "$n" -lt 50 ] && flag=" <-- TOO SHORT"; [ "$n" -gt 60 ] && flag=" <-- TOO LONG"
  echo "$n  $f  $t$flag"
done
```

Find pages missing required tags:

```bash
grep -rL 'rel="canonical"' --include="*.html" . | grep -v node_modules
grep -rL 'name="description"' --include="*.html" . | grep -v node_modules
grep -rL 'property="og:image"' --include="*.html" . | grep -v node_modules
```

Find surviving placeholder tokens:

```bash
grep -rn '{{' --include="*.html" --include="*.tsx" --include="*.jsx" . | grep -v node_modules
grep -rni 'lorem ipsum\|href="#"\|TODO\|FIXME' --include="*.html" --include="*.tsx" . | grep -v node_modules
```

## Open Graph image

Produce `og-image.jpg` at exactly 1200x630, under 1MB. Use the client's logo on a
solid brand background, or a real photograph of their work. Not a generated graphic.

```bash
# From a source image, crop to 1200x630 and compress
magick source.jpg -resize 1200x630^ -gravity center -extent 1200x630 -quality 85 og-image.jpg
identify -format "%wx%h %b\n" og-image.jpg   # confirm 1200x630 and size
```

Verify the preview renders before launch. Paste the live URL into:
- Facebook: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/
- X: https://cards-dev.twitter.com/validator

## Structured data

Home page, every site:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{{BUSINESS_NAME}}",
  "url": "https://{{DOMAIN}}",
  "logo": "https://{{DOMAIN}}/logo.png",
  "telephone": "{{+1XXXXXXXXXX}}",
  "sameAs": ["{{FACEBOOK_URL}}", "{{INSTAGRAM_URL}}"]
}
</script>
```

Add this instead if the business serves a physical area:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "{{BUSINESS_NAME}}",
  "url": "https://{{DOMAIN}}",
  "image": "https://{{DOMAIN}}/storefront.jpg",
  "telephone": "{{+1XXXXXXXXXX}}",
  "priceRange": "{{$$}}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{{STREET}}",
    "addressLocality": "{{CITY}}",
    "addressRegion": "{{STATE_ABBR}}",
    "postalCode": "{{ZIP}}",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "{{LAT}}", "longitude": "{{LNG}}" },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "08:00", "closes": "17:00"
  }],
  "areaServed": { "@type": "City", "name": "{{CITY}}" }
}
</script>
```

FAQ page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "{{QUESTION_TEXT}}",
    "acceptedAnswer": { "@type": "Answer", "text": "{{ANSWER_TEXT}}" }
  }]
}
</script>
```

Rules: only mark up facts that are visible on the page. Hours, phone, and address in
JSON-LD must match the footer exactly. Validate at
https://search.google.com/test/rich-results before launch.
