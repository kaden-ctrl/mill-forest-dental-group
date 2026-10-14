// The only file you edit per project. Everything else is generic.
export interface FormCase { field: string; value: string; expectError: boolean }

export default {
  // Local dev server during build, the live domain before launch.
  baseURL: process.env.SITE_URL || 'http://localhost:3000',

  // Every public page. Must match sitemap.xml.
  pages: [
    '/',
    '/services',
    '/about',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
  ],

  // Pages that legitimately have no indexable content requirements.
  skipSeoChecks: [] as string[],

  form: {
    page: '/contact',
    selector: 'form',
    endpoint: '/api/contact',          // set to '' to skip endpoint-level tests
    submitText: /send message|request a quote|book/i,
    honeypotField: 'company_url',
    fields: { name: 'name', email: 'email', message: 'message', consent: 'consent' },
  },

  // Analytics measurement ID. Empty string skips the analytics test.
  analyticsId: process.env.GA_ID || '',

  // Agency build credit in the footer. Required on new builds as of 2026-10-14.
  // Set `required: false` for a site that launched before that and never carried
  // it, since the standard is forward-looking and existing sites are not retrofitted.
  // Also set it false where the client declined the credit in writing.
  credit: {
    required: true,
    text: /website by/i,
    href: 'https://duogroup.com',
    name: 'Duo Group',
  },

  // Design constraints from the standards.
  design: {
    maxBorderRadiusPx: 8,            // pill buttons banned
    minTapTargetPx: 44,
    minInputFontPx: 16,              // below this iOS zooms on focus
    maxFontFamilies: 2,
  },

  // External hosts that rate-limit or block crawlers.
  skipLinkHosts: [
    'linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  ],

  // Files that must NOT be publicly reachable. A static host serves whatever is in
  // the publish directory, so build notes and config end up readable unless excluded.
  // CLAUDE.md is the usual offender: it ships with the site and names infrastructure.
  privatePaths: [
    '/CLAUDE.md',
    '/README.md',
    '/.claude/skills/website-build-standards/SKILL.md',
    '/.env',
    '/.env.local',
    '/netlify.toml',
    '/package.json',
    '/.git/config',
    '/verification/site.config.ts',
  ],

  // Root files that must exist and return 200.
  rootFiles: [
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/favicon.svg',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/site.webmanifest',
  ],
}
