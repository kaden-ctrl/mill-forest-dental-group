#!/bin/bash
# Scan a website build for AI-slop copy, prohibited design patterns, and
# unfinished placeholders. Run before launch.
#
#   ./scan-copy.sh [directory]
#
# Exit 0 = clean. Exit 1 = findings that must be fixed.

HERE="$(cd "$(dirname "$0")" && pwd)"
PHRASES="$HERE/banned-phrases.txt"
TARGET="${1:-.}"
cd "$TARGET" || { echo "Cannot enter $TARGET"; exit 2; }
echo "Scanning $(pwd)"
DIR="."
FINDINGS=0

# .claude holds this skill's own documentation, which lists every banned phrase
# by definition. verification/ holds the Playwright specs, which do the same.
# Scanning either floods the output with false positives and buries real findings.
EXCL=(--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
      --exclude-dir=build --exclude-dir=.next --exclude-dir=.svelte-kit
      --exclude-dir=vendor --exclude-dir=coverage --exclude-dir=.venv
      --exclude-dir=.claude --exclude-dir=verification
      --exclude-dir=playwright-report --exclude-dir=test-results)
CONTENT=(--include=*.html --include=*.htm --include=*.tsx --include=*.jsx
         --include=*.ts --include=*.js --include=*.vue --include=*.svelte
         --include=*.astro --include=*.md --include=*.mdx --include=*.php
         --include=*.liquid --include=*.njk --include=*.hbs)
STYLES=(--include=*.css --include=*.scss --include=*.sass --include=*.less
        --include=*.tsx --include=*.jsx --include=*.html --include=*.vue
        --include=*.svelte --include=*.astro)

hdr() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
hit() { FINDINGS=$((FINDINGS+1)); }

# ---------------------------------------------------------------- copy
hdr "Banned phrases"
if [ -f "$PHRASES" ]; then
  out=$(grep -rniF -f "$PHRASES" "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null)
  if [ -n "$out" ]; then echo "$out" | head -60; hit
    n=$(echo "$out" | wc -l | tr -d ' '); echo "  ($n total)"
  else echo "none"; fi
else
  echo "WARNING: banned-phrases.txt not found at $PHRASES"
fi

# UTF-8 aware search across content files. BSD grep matches bracket
# expressions bytewise, which misreads multibyte characters, so use perl.
content_files() {
  find "$DIR" -type d \( -name node_modules -o -name .git -o -name dist \
      -o -name build -o -name .next -o -name .svelte-kit -o -name vendor \
      -o -name .claude -o -name verification -o -name playwright-report \
      -o -name test-results \) -prune -o \
    -type f \( -name '*.html' -o -name '*.htm' -o -name '*.tsx' -o -name '*.jsx' \
      -o -name '*.ts' -o -name '*.js' -o -name '*.vue' -o -name '*.svelte' \
      -o -name '*.astro' -o -name '*.md' -o -name '*.mdx' -o -name '*.php' \
      -o -name '*.liquid' -o -name '*.njk' -o -name '*.hbs' \) -print 2>/dev/null
}

uni_match() {
  content_files | tr '\n' '\0' | xargs -0 -r perl -Mopen=:std,:utf8 -ne \
    'print "$ARGV:$.: $_" if /'"$1"'/; close ARGV if eof;' 2>/dev/null
}

hdr "Em dashes and en dashes in copy"
out=$(uni_match '[\x{2014}\x{2013}]')
if [ -n "$out" ]; then echo "$out" | head -40; hit; else echo "none"; fi

hdr "Emoji used as icons or in copy"
# True emoji blocks, plus the variation selector that forces emoji presentation,
# plus the handful of high-signal emoji that live in the older symbol blocks.
# Deliberately NOT included: arrows (U+2190-21FF, U+2B00-2BFF), check and cross
# marks, and stars such as U+2605. Those are typography, not emoji icons, and
# flagging them buries the real findings.
EMOJI='[\x{1F000}-\x{1FAFF}\x{FE0F}\x{2600}\x{2601}\x{2614}\x{2615}\x{26A0}\x{26A1}\x{2705}\x{270A}\x{270B}\x{2728}\x{274C}\x{274E}\x{2757}\x{2B50}\x{2B55}]'
out=$(uni_match "$EMOJI")
if [ -n "$out" ]; then echo "$out" | head -40; hit; else echo "none"; fi

# ---------------------------------------------------------------- design
hdr "Pill-shaped buttons"
out=$(grep -rniE 'border-radius:\s*(9999|999|9000)px|border-radius:\s*50rem|border-radius:\s*100vmax|rounded-full' \
      "${EXCL[@]}" "${STYLES[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then
  echo "$out" | head -30
  echo "  Note: this cannot distinguish a button from a badge or chip, which are"
  echo "  conventionally pill-shaped. verify:design measures rendered buttons only."
  hit
else echo "none"; fi

hdr "Purple / violet gradients"
out=$(grep -rniE 'linear-gradient[^;]*(#6[0-9a-f]{2}ea|#764ba2|#667eea|#8b5cf6|#a855f7|#7c3aed|#9333ea|#c084fc|#6d28d9|purple|violet|fuchsia)' \
      "${EXCL[@]}" "${STYLES[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then echo "$out" | head -30; hit; else echo "none"; fi

hdr "Animated counters"
out=$(grep -rniE 'countup|count-up|data-target=|animatednumber|animated-number|odometer' \
      "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then echo "$out" | head -30; hit; else echo "none"; fi

hdr "Custom cursor effects"
out=$(grep -rniE 'cursor:\s*url\(|custom-cursor|cursor-follow|cursorfollow|magnetic-cursor|spotlight-cursor' \
      "${EXCL[@]}" "${STYLES[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then echo "$out" | head -30; hit; else echo "none"; fi

hdr "Suppressed focus outlines"
out=$(grep -rniE 'outline:\s*(none|0)' "${EXCL[@]}" "${STYLES[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then
  echo "$out" | head -30
  echo "  Each must be paired with a :focus-visible replacement. Verify manually."
  hit
else echo "none"; fi

hdr "Unrequested widgets"
out=$(grep -rniE 'exit-intent|exitintent|newsletter-popup|newsletter-modal|intercom|drift\.com|tawk\.to|crisp\.chat' \
      "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then
  echo "$out" | head -20
  echo "  Confirm the client requested each of these."
  hit
else echo "none"; fi

# ---------------------------------------------------------------- unfinished
hdr "Unfilled placeholder tokens"
out=$(grep -rn '{{' "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null \
      | grep -vE '\{\{\s*[a-z_$][a-zA-Z0-9_.$\[\]]*\s*\}\}' | grep -vE '\{\{#|\{\{/|\{\{>')
if [ -n "$out" ]; then echo "$out" | head -40; hit; else echo "none"; fi

hdr "Placeholder links and TODOs"
out=$(grep -rnE 'href="#"|href=.#.>|TODO|FIXME|XXX:' "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null)
if [ -n "$out" ]; then echo "$out" | head -30; hit; else echo "none"; fi

# ---------------------------------------------------------------- a11y / seo
hdr "Images missing alt"
out=$(grep -rn '<img' "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null | grep -v 'alt=')
if [ -n "$out" ]; then echo "$out" | head -30; hit; else echo "none"; fi

hdr "Images missing width/height (causes layout shift)"
out=$(grep -rn '<img' "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null | grep -v 'width=')
if [ -n "$out" ]; then echo "$out" | head -30; hit; else echo "none"; fi

hdr "target=_blank without rel=noopener"
out=$(grep -rn 'target="_blank"' "${EXCL[@]}" "${CONTENT[@]}" "$DIR" 2>/dev/null | grep -v 'rel=')
if [ -n "$out" ]; then echo "$out" | head -20; hit; else echo "none"; fi

hdr "HTML pages missing canonical or meta description"
found_html=0
while IFS= read -r f; do
  found_html=1
  grep -q 'rel="canonical"' "$f" || { echo "no canonical:   $f"; hit; }
  grep -q 'name="description"' "$f" || { echo "no description: $f"; hit; }
done < <(find "$DIR" -type d \( -name node_modules -o -name .git -o -name .claude \
         -o -name dist -o -name build -o -name verification \) -prune -o \
         -type f -name '*.html' -print 2>/dev/null)
[ "$found_html" -eq 0 ] && echo "no .html files found (framework-rendered site, check templates manually)"

# ---------------------------------------------------------------- result
printf '\n'
if [ "$FINDINGS" -eq 0 ]; then
  printf '\033[32mClean. %s categories checked, no findings.\033[0m\n' 16
  exit 0
else
  printf '\033[31m%s categories with findings. Fix before launch.\033[0m\n' "$FINDINGS"
  exit 1
fi
