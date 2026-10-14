#!/usr/bin/env bash
# Swap every reference from the Netlify preview host to the live domain.
#
# Run this ONLY after DNS has moved and https://millforestdental.com serves this
# site with a valid certificate. Running it early points canonicals at a host
# that does not resolve yet, which is worse than leaving them alone.
#
#   ./scripts/cutover-domain.sh --check     show what would change, touch nothing
#   ./scripts/cutover-domain.sh             apply the change
#
# After applying: commit to staging, verify on the branch deploy, then publish.
# Finally submit https://millforestdental.com/sitemap.xml in Search Console.

set -euo pipefail
cd "$(dirname "$0")/.."

OLD="millforestdental.netlify.app"
NEW="millforestdental.com"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

echo "=== preflight: is the live domain actually serving this site? ==="
code=$(curl -so /dev/null -w '%{http_code}' --max-time 20 "https://$NEW/" || echo 000)
echo "  https://$NEW/ -> $code"
if [ "$code" != "200" ]; then
  echo "  WARNING: not serving yet. Do not apply this until it returns 200."
  [ "$CHECK" -eq 0 ] && { echo "  refusing to apply. Re-run with --check, or wait for DNS."; exit 1; }
fi

echo
echo "=== references to rewrite ==="
python3 - "$OLD" <<'PY'
import sys, pathlib, collections
old = sys.argv[1]
by_ext = collections.Counter(); total = 0
for p in pathlib.Path('.').rglob('*'):
    if not p.is_file() or '.git' in p.parts or '.claude' in p.parts: continue
    if p.suffix not in ('.html', '.xml', '.txt', '.webmanifest'): continue
    n = p.read_text(errors='ignore').count(old)
    if n:
        by_ext[p.suffix] += 1; total += n
for ext in ('.html', '.xml', '.txt', '.webmanifest'):
    print(f"  {'*'+ext:<14} {by_ext.get(ext,0)} files")
print(f"  {total} occurrences in total")
PY

if [ "$CHECK" -eq 1 ]; then
  echo
  echo "check only, nothing written."
  exit 0
fi

echo
echo "=== rewriting ==="
python3 - "$OLD" "$NEW" <<'PY'
import sys, pathlib
old, new = sys.argv[1], sys.argv[2]
changed = 0
for p in pathlib.Path('.').rglob('*'):
    if not p.is_file(): continue
    if '.git' in p.parts or '.claude' in p.parts: continue
    if p.suffix not in ('.html', '.xml', '.txt', '.webmanifest'): continue
    t = p.read_text()
    if old in t:
        p.write_text(t.replace(old, new)); changed += 1
print(f"  rewrote {changed} files")
PY

echo
echo "=== verification ==="
python3 - "$OLD" <<'PY'
import sys, pathlib
old = sys.argv[1]
left = sum(p.read_text(errors='ignore').count(old) for p in pathlib.Path('.').rglob('*')
           if p.is_file() and '.git' not in p.parts and '.claude' not in p.parts
           and p.suffix in ('.html','.xml','.txt','.webmanifest'))
print(f"  stale references remaining: {left} (want 0)")
PY
python3 - <<'PY'
import json, re, pathlib
bad = []
for p in pathlib.Path('.').rglob('*.html'):
    if '.git' in p.parts or '.claude' in p.parts: continue
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', p.read_text(), re.S):
        try: json.loads(m.group(1))
        except Exception: bad.append(str(p))
print("  JSON-LD still valid:", "yes" if not bad else f"NO - {bad[:3]}")
import xml.dom.minidom
xml.dom.minidom.parse('sitemap.xml'); print("  sitemap.xml parses: yes")
PY

cat <<'EOF'

Next:
  1. git add -A && git commit -m "Point canonicals, sitemap, and OG tags at millforestdental.com"
  2. git push origin staging    and check the branch deploy
  3. merge to main when it looks right
  4. submit https://millforestdental.com/sitemap.xml in Search Console
  5. re-check: curl -sI https://millforestdental.com | grep -i x-robots-tag   (must be empty)
EOF
