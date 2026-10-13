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
