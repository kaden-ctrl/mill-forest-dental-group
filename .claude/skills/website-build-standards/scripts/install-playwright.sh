#!/bin/bash
# Install the verification suite into a website project.
#
#   install-playwright.sh [target-directory]
#
# Copies the Playwright config and specs, installs dependencies, and ensures
# the Chromium browser is available. Does not overwrite an existing
# site.config.ts, since that holds project-specific settings.
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-.}"
cd "$TARGET" || { echo "Cannot enter $TARGET"; exit 1; }
DEST="$(pwd)/verification"

echo "Installing verification suite into $DEST"
mkdir -p "$DEST/tests"
cp "$SKILL/templates/playwright/playwright.config.ts" "$DEST/"
cp "$SKILL/templates/playwright/package.json" "$DEST/"
cp "$SKILL/templates/playwright/tests/"*.spec.ts "$DEST/tests/"

if [ -f "$DEST/site.config.ts" ]; then
  echo "Kept existing site.config.ts (project-specific, not overwritten)"
  echo "Reference copy written to site.config.ts.new for comparison"
  cp "$SKILL/templates/playwright/site.config.ts" "$DEST/site.config.ts.new"
else
  cp "$SKILL/templates/playwright/site.config.ts" "$DEST/"
  echo "Wrote site.config.ts. EDIT THIS FIRST: set baseURL, pages, and the form selectors."
fi

cd "$DEST"
echo
echo "Installing dependencies..."
npm install --silent

echo "Ensuring Chromium is available..."
npx playwright install chromium

cat <<'MSG'

Installed. Next steps:

  1. Edit verification/site.config.ts
       baseURL      your dev server or live domain
       pages        every public page, matching sitemap.xml
       form         the contact form selectors and endpoint
       analyticsId  leave empty to skip the analytics tests

  2. Start the site, then run:
       cd verification && npm run verify

  3. Mobile Safari is the one engine that reproduces real iOS behaviour.
     It needs an extra download:
       npx playwright install webkit
       npm run verify:safari

  4. Against the live site before launch:
       SITE_URL=https://clientdomain.com npm run verify

Individual suites: npm run verify:seo | verify:a11y | verify:forms |
verify:design | verify:links | verify:console | verify:responsive
MSG
