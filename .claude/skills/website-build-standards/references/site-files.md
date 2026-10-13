# Site Files

Exact contents for every file that must exist at the site root.

## robots.txt

```
User-agent: *
Allow: /

Disallow: /thank-you
Disallow: /thanks
Disallow: /admin
Disallow: /wp-admin/
Disallow: /cgi-bin/
Disallow: /*?*preview=
Disallow: /search

Sitemap: https://{{DOMAIN}}/sitemap.xml
```

Verify after deploy:

```bash
curl -s https://{{DOMAIN}}/robots.txt
curl -so /dev/null -w "%{http_code}\n" https://{{DOMAIN}}/robots.txt   # want 200
```

Confirm staging is NOT crawlable. A staging site must serve this instead:

```
User-agent: *
Disallow: /
```

## sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://{{DOMAIN}}/</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://{{DOMAIN}}/services</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://{{DOMAIN}}/about</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://{{DOMAIN}}/contact</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://{{DOMAIN}}/faq</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://{{DOMAIN}}/privacy</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>0.1</priority>
  </url>
  <url>
    <loc>https://{{DOMAIN}}/terms</loc>
    <lastmod>{{YYYY-MM-DD}}</lastmod>
    <priority>0.1</priority>
  </url>
</urlset>
```

Must not contain: the 404 page, thank-you pages, anything noindexed, any non-canonical
variant (no `www` if the canonical is non-www), any `http://` URL.

Verify every URL in the sitemap returns 200:

```bash
curl -s https://{{DOMAIN}}/sitemap.xml \
  | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | while read -r u; do printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' "$u")" "$u"; done
```

Every line must start with 200. Anything else is a broken sitemap entry.

## site.webmanifest

```json
{
  "name": "{{BUSINESS_NAME}}",
  "short_name": "{{SHORT_NAME_12_CHARS_MAX}}",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "{{BRAND_HEX}}",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/"
}
```

## Favicon generation

Required files at site root: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`,
`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`.

From the client's logo, using ImageMagick (`brew install imagemagick`):

```bash
# Square, high-resolution source. Crop the logo to its mark first if it is a wordmark.
SRC=logo-mark.png

magick "$SRC" -resize 512x512 icon-512.png
magick "$SRC" -resize 192x192 icon-192.png
magick "$SRC" -resize 180x180 -background white -alpha remove -alpha off apple-touch-icon.png
magick "$SRC" -resize 32x32 favicon-32.png
magick "$SRC" -resize 16x16 favicon-16.png
magick favicon-16.png favicon-32.png favicon.ico

# Maskable icon needs the mark at 80% inside a safe zone with a solid background
magick "$SRC" -resize 410x410 -background "{{BRAND_HEX}}" -gravity center -extent 512x512 icon-512-maskable.png

rm favicon-16.png favicon-32.png
identify favicon.ico icon-192.png icon-512.png apple-touch-icon.png
```

Copy the logo SVG to `favicon.svg`. If the logo has fine detail or text, simplify it:
at 16x16 a wordmark is unreadable. Use the initial or the symbol only.

Verification, which is not "the files exist":

```bash
for f in favicon.ico favicon.svg apple-touch-icon.png icon-192.png icon-512.png site.webmanifest; do
  printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' "https://{{DOMAIN}}/$f")" "$f"
done
```

Then open the site in a real browser and confirm the icon appears in the tab. Hard
refresh, since favicons cache aggressively.

## 404 page

Must return HTTP status 404, not 200. A soft 404 returning 200 gets the error page
indexed.

```bash
curl -so /dev/null -w "%{http_code}\n" https://{{DOMAIN}}/this-page-does-not-exist
# want 404
```

Content: the site's normal header and navigation, a one-line explanation, and links to
the home page and the main services. No joke copy, no illustration.

```html
<h1>That page does not exist</h1>
<p>The page you tried to reach may have moved or been removed.</p>
<ul>
  <li><a href="/">Home</a></li>
  <li><a href="/services">Services</a></li>
  <li><a href="/contact">Contact us</a></li>
</ul>
```

## Redirects and headers

Pick one canonical host, redirect the other with a 301. Force HTTPS.

**Netlify** (`netlify.toml`):

```toml
[[redirects]]
  from = "https://www.{{DOMAIN}}/*"
  to = "https://{{DOMAIN}}/:splat"
  status = 301
  force = true

[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

**Vercel** (`vercel.json`):

```json
{
  "redirects": [
    { "source": "/:path*", "has": [{ "type": "host", "value": "www.{{DOMAIN}}" }],
      "destination": "https://{{DOMAIN}}/:path*", "permanent": true }
  ],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" }
    ]}
  ]
}
```

**Apache** (`.htaccess`):

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [R=301,L]

Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

Verify redirects and headers:

```bash
# Each must land on the canonical https host with a single 301
curl -sIL http://{{DOMAIN}}       | grep -E "^(HTTP|location:)"
curl -sIL http://www.{{DOMAIN}}   | grep -E "^(HTTP|location:)"
curl -sIL https://www.{{DOMAIN}}  | grep -E "^(HTTP|location:)"

# Headers present on the live site
curl -sI https://{{DOMAIN}} | grep -iE "strict-transport|x-content-type|x-frame|referrer-policy"
```

Watch for redirect chains. `http://www` to `https://www` to `https://` is two hops
where one will do.
