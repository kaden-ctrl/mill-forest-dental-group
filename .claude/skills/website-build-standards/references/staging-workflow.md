# Staging Workflow Setup

One-time per project. Puts a staging branch with its own Netlify preview URL between
the work and production, so nothing reaches the live site without being asked for.

Placeholders use `{{TOKEN}}` rather than angle brackets, because `<BRANCH>` in a shell
command is an input redirect from a file named `BRANCH`, and because `scan-copy.sh`
greps for `{{` to catch placeholders that were never filled in.

## Prerequisites

- `gh` authenticated
- `netlify` CLI authenticated
- A Netlify site already connected to a Git repo, not drag-and-drop deployed

## 1. Inventory before changing anything

```bash
cd {{PROJECT_DIR}}
git fetch origin --prune
gh pr list --state open --json number,title,headRefName,additions,deletions
git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||'
```

For each branch that is not the default branch:

```bash
git log  --oneline {{DEFAULT_BRANCH}}..origin/{{BRANCH}}
git diff --stat {{DEFAULT_BRANCH}}..origin/{{BRANCH}}
```

This is the step people skip. Moving to a staging workflow removes the merge path for
any open pull request. Anything in flight becomes orphaned the moment the rule
changes, so decide its fate deliberately rather than discovering it weeks later.

## 2. Write the rule, commit to the default branch first

```bash
git checkout {{DEFAULT_BRANCH}} && git pull --ff-only origin {{DEFAULT_BRANCH}}
# create CLAUDE.md
git add CLAUDE.md && git commit -m "Add CLAUDE.md with the staging publishing workflow"
git push origin {{DEFAULT_BRANCH}}
```

Template:

```markdown
# {{PROJECT_NAME}}

## Publishing workflow

Never open pull requests. Commit and push all changes to the `{{STAGING_BRANCH}}`
branch. After pushing, give me the staging preview URL and a summary of what
changed. Only merge `{{STAGING_BRANCH}}` into `{{DEFAULT_BRANCH}}` and push when I
explicitly say to publish or push it live.

## Project facts

- Netlify site slug is `{{SLUG}}`; production is https://{{SLUG}}.netlify.app
- Staging preview: https://{{STAGING_BRANCH}}--{{SLUG}}.netlify.app
- Repo: `{{OWNER}}/{{REPO}}`

## Before pushing

{{the commands that must pass, plus any known failures and why they are accepted}}
```

## 3. Branch after the commit

```bash
git checkout -b {{STAGING_BRANCH}}
git push -u origin {{STAGING_BRANCH}}
```

Doing it in this order means both branches sit on the identical commit. Branch first
and you have created a divergence on day one for no reason.

## 4. Enable branch deploys

Netlify defaults to building only the production branch. The field is
`build_settings.allowed_branches`.

```bash
netlify sites:list --json
netlify link --id {{SITE_ID}}

netlify api getSite --data '{"site_id":"{{SITE_ID}}"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['build_settings']['allowed_branches'])"

netlify api updateSite --data '{"site_id":"{{SITE_ID}}","body":{"build_settings":{"allowed_branches":["{{DEFAULT_BRANCH}}","{{STAGING_BRANCH}}"]}}}'
```

Then re-read it. Netlify's API reports success in places where nothing was actually
stored, so confirm the value came back changed rather than trusting the response.

## 5. Bootstrap, because enabling alone does nothing

Two traps, both of which produce a 404 that looks like a broken setting:

- A push made before the branch was allowed is ignored permanently. Netlify decides
  at webhook time. You need a fresh push afterwards. An empty commit is fine, and
  label it so the odd commit is self-explaining.
- `createSiteBuild` builds production, not an arbitrary branch. It will not help.

```bash
git commit --allow-empty -m "Bootstrap the staging branch deploy"
git push origin {{STAGING_BRANCH}}
```

Verify what actually built, not just that the setting changed:

```bash
netlify api listSiteDeploys --data '{"site_id":"{{SITE_ID}}"}' \
  | python3 -c "
import sys,json
for x in json.load(sys.stdin)[:5]: print(x['state'], x['branch'], x['context'])"
```

You want a row reading `ready {{STAGING_BRANCH}} branch-deploy`. Until that appears,
the URL stays 404 regardless of configuration.

```bash
curl -so /dev/null -w '%{http_code}\n' https://{{STAGING_BRANCH}}--{{SLUG}}.netlify.app
```

## 6. Keep internal files off the public site

`CLAUDE.md` ships with the site. On any static host it is readable at `/CLAUDE.md`.
Fine for build notes, bad if it names infrastructure, site IDs, or internal URLs.
Exclude it from the start rather than after it has been indexed.

Which fix applies depends on the publish directory:

**Publish directory is a build output** (`dist`, `public`, `_site`): `CLAUDE.md` at the
repo root is already excluded. Confirm it, do not assume.

**Publish directory is the repo root**, which is the common case for a hand-built
static site: the file is served, and the fix is a forced 404 redirect.

```toml
# netlify.toml
[[redirects]]
  from = "/CLAUDE.md"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/.claude/*"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/README.md"
  to = "/404.html"
  status = 404
  force = true
```

Verify against the deployed site, not the config:

```bash
for p in /CLAUDE.md /README.md /.claude/skills/website-build-standards/SKILL.md \
         /.env /netlify.toml /package.json /.git/config; do
  printf "%s %s\n" "$(curl -so /dev/null -w '%{http_code}' https://{{SLUG}}.netlify.app$p)" "$p"
done
```

Every line must read 404 or 403. A 200 on any of them means that file is public.
`npm run verify:seo` asserts this too, so it stays checked on every run.

## Two carry-over lessons

**Record known-failing checks and why they are accepted.** Put them in `CLAUDE.md`
under "Before pushing". Otherwise the next person, or the next session, "fixes" a
deliberate tradeoff.

**Re-read every setting you write through an API.** This applies well beyond Netlify.
A success response is not confirmation that a value was stored.
