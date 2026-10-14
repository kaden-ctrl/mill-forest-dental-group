# Mill Forest Dental Group

## Publishing workflow

Never open pull requests. Commit and push all changes to the `staging` branch.
After pushing, give me the staging preview URL and a summary of what changed.
Only merge `staging` into `main` and push when I explicitly say to publish or
push it live.

## Project facts

- Netlify site slug is `millforestdental`; production is <https://millforestdental.netlify.app>
- Staging preview: <https://staging--millforestdental.netlify.app>
- Repo: `kaden-ctrl/mill-forest-dental-group`
- Static HTML site, no build step. Netlify publishes the repo root.
- Launch target is `millforestdental.com` (DNS at eNom). Not yet cut over, so
  canonicals, OG tags, sitemap, and llms.txt still point at the netlify.app host.
  All of those must be swapped at cutover.

## Before pushing

There is no test suite or build. Run these checks for the files you touched:

```bash
# JSON-LD on every page must parse
python3 - <<'PY'
import json,re,pathlib
bad=[]
for p in pathlib.Path('.').rglob('*.html'):
    if '.git' in p.parts: continue
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', p.read_text(), re.S):
        try: json.loads(m.group(1))
        except Exception as e: bad.append((str(p), str(e)[:60]))
print("JSON-LD errors:", bad or "none")
PY

# internal links must resolve (no 404s introduced)
# after deploy, spot-check the pages you changed against the staging URL
```

Verify the deploy actually served the change before reporting done. Netlify
serves the previous build until the new one finishes, so a curl immediately
after `git push` will show stale content.

## Known gotchas, do not "fix" these

- **Five pages carry inline `<style>` and do NOT load `assets/mfd.css`:**
  `index.html`, `about/`, `services/`, `new-patients/`, `contact/`. Any CSS
  change must be applied in both places or it silently fails on those five.
- **`assets/mfd.css` is cached for 7 days** via `_headers`. The `<link>` carries
  a `?v=N` query string. **Bump that version on every CSS change** or returning
  visitors keep the old stylesheet. Currently at `v=7`.
- `zsh` does not word-split unquoted variables, so `for x in $list` iterates
  once over the whole string. Use Python for file loops.
- Doctor order is alphabetical by surname (Augustine, Butler, Hermstein, Tutt)
  in the nav, mobile menu, homepage grid, and About rows.
- Homepage doctor cards use `data-d` stagger values (1, 2, none, 1) that belong
  to the grid position, not the doctor. Reassign positionally if reordered.
- Client-supplied copy (doctor bios especially) is verbatim. The no-em-dash rule
  does not override it.
- No em dashes anywhere in site copy we write.
- No two pages may share a hero photo.

## Accepted, deliberate states

- `mill-forest-dental-homepage.html` is a 565-byte `noindex` redirect stub kept
  for an old inbound URL. It intentionally lacks nav, favicon tags, and GA4.
- `/diagnodent/` shows a generic dental screening photo, not an actual
  DIAGNOdent. No real DIAGNOdent image exists in any stock library. Awaiting a
  photo from the practice.
- `/dental-laser/` shows a generic diode laser, not the practice's actual
  Gemini EVO. Same situation.

## Website Build Standards: accepted deviations

Audited against `website-build-standards` on 2026-10-14. These fail the standard
deliberately. Do not "fix" them without asking the client.

- **Pill buttons.** `.btn` uses `border-radius:999px`; the standard requires 4 to 8px.
  This is the approved visual identity. The other `999px` values are the arch photo
  frames, which are the site's signature shape, not buttons.
- **Four banned phrases, seven instances.** "cutting-edge" (cosmetic-dentistry),
  "state-of-the-art" (what-sets-us-apart, and Dr. Tutt's bio), "revolutionary"
  (diagnodent), "when it comes to" (common-procedures, intraoral-camera, sealants).
  The Tutt instance is inside client-supplied verbatim copy and cannot be changed.
  The rest were carried over from the client's previous site and the client chose to
  keep them.
- **One em dash**, in Dr. Hermstein's bio. Client-supplied verbatim copy. The
  no-em-dash rule does not override it.
- **`favicon.svg` wraps a raster.** No vector of the crest exists; the only `logo.svg`
  on the old site was the vendor's own logo. Replace if the client ever supplies the
  original logo artwork.
- **The scanner's dash and focus-outline findings are false positives.** The dashes it
  flags are non-breaking hyphens in "Same-day" and a CSS `content:"-"` on the mobile
  accordion. Focus outlines are reset but replaced by
  `:focus-visible{outline:3px solid #A96F15}`.

### Still outstanding

- Legal pages carry `<mark class="tbd">[CLIENT TO CONFIRM]</mark>` on the legal entity
  name, the 24-month form retention period, and the court venue. They also need
  attorney review before launch, and the client must be told that in writing.
- Not yet run: axe, pa11y, linkinator, Lighthouse, and the 8-case form test.
