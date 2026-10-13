# Legal Pages

Draft these, then tell the client in writing that they require attorney review before
launch. Never describe generated legal copy as approved or compliant.

Fill every `{{...}}` token from the client intake. If a token cannot be filled, stop
and ask. Do not guess a jurisdiction or a retention period.

## Privacy policy, at /privacy

Required headings, in this order:

```markdown
# Privacy Policy

**Last updated:** {{MONTH DD, YYYY}}

{{BUSINESS_LEGAL_NAME}} ("we", "us") operates {{DOMAIN}}. This policy explains what
information we collect, why we collect it, and what you can do about it.

## Information we collect

**Information you give us.** When you submit our contact form we collect your name,
email address{{, and phone number if provided}}, and the content of your message.

**Information collected automatically.** {{IF_ANALYTICS: We use {{ANALYTICS_PRODUCT}}
to understand how visitors use the site. This collects your IP address, browser type,
device type, pages visited, and time spent on the site. This data is aggregated and
is not used to identify you personally.}}

**Cookies.** {{IF_NO_NONESSENTIAL: We use only cookies strictly necessary for the site
to function.}} {{IF_ANALYTICS: We use analytics cookies, which are set only after you
consent. You can withdraw consent at any time by {{HOW}}.}}

## How we use your information

- To respond to your enquiry
- To provide the services you request
- {{IF_ANALYTICS: To measure and improve site performance}}
- To meet legal and record-keeping obligations

We do not sell your personal information. We do not share it with third parties for
their own marketing.

## Who we share information with

We use these service providers, who process data on our behalf:

| Provider | Purpose | Privacy policy |
|---|---|---|
| {{HOSTING_PROVIDER}} | Website hosting | {{URL}} |
| {{FORM_HANDLER}} | Contact form delivery | {{URL}} |
| {{ANALYTICS_PRODUCT}} | Site analytics | {{URL}} |
| {{EMAIL_PROVIDER}} | Email delivery | {{URL}} |

We may also disclose information where required by law.

## How long we keep it

Contact form submissions are kept for {{RETENTION_PERIOD}}. {{IF_ANALYTICS: Analytics
data is retained for {{GA_RETENTION}} and is then deleted automatically.}}

## Your rights

You can ask us to:
- tell you what personal information we hold about you
- correct information that is wrong
- delete your information
- stop using your information for a given purpose

Email {{PRIVACY_EMAIL}} and we will respond within {{RESPONSE_DAYS}} days.

{{IF_CALIFORNIA: ## California residents

Under the CCPA and CPRA you have the right to know what personal information we
collect, to request its deletion, to correct it, and to opt out of its sale or
sharing. We do not sell or share personal information as those terms are defined in
the CCPA. We will not discriminate against you for exercising these rights. To make a
request, email {{PRIVACY_EMAIL}}.}}

{{IF_EU_VISITORS: ## Visitors from the EU and UK

Our legal basis for processing your contact details is your consent, given when you
submit the form, and our legitimate interest in responding to enquiries. You have the
right to access, correct, delete, restrict, or port your data, and to object to
processing. You can lodge a complaint with your national data protection authority.}}

## Children

The site is not directed at children under 13 and we do not knowingly collect their
information.

## Changes

We may update this policy. The date at the top shows the current version.

## Contact

{{BUSINESS_LEGAL_NAME}}
{{STREET_ADDRESS}}
{{CITY}}, {{STATE}} {{ZIP}}
{{PRIVACY_EMAIL}}
{{PHONE}}
```

Rules:
- The provider table must list every service that actually receives data. Check the
  deployed site's network requests to confirm nothing is missing.
- Delete the conditional blocks that do not apply. A policy describing analytics on a
  site with no analytics is wrong in the other direction.
- If the client has no retention policy, propose one (24 months is common for lead
  enquiries) and mark it for their confirmation.

Cross-check the policy against what the site actually loads:

```bash
# Every third-party host the live page contacts. Each must appear in the table.
npx lighthouse https://{{DOMAIN}} --output=json --output-path=./lh.json --quiet \
  --chrome-flags="--headless"
node -e '
const items = require("./lh.json").audits["network-requests"].details.items;
const hosts = [...new Set(items.map(i => new URL(i.url).host))];
hosts.forEach(h => console.log(h));
'
```

## Terms, at /terms

```markdown
# Terms of Service

**Last updated:** {{MONTH DD, YYYY}}

These terms govern your use of {{DOMAIN}}, operated by {{BUSINESS_LEGAL_NAME}}. By
using the site you accept them.

## Use of this site

You may view and use this site for the purpose of learning about and enquiring about
our services. You may not:

- copy, republish, or resell its content
- attempt to gain unauthorised access to the site or its systems
- use automated tools to scrape or overload the site
- submit false information or impersonate another person
- use the site for any unlawful purpose

## Our content

All content on this site, including text, images, logos, and design, is owned by
{{BUSINESS_LEGAL_NAME}} or used under licence, and is protected by copyright and
trademark law.

## Services and quotes

Information on this site describes our services in general terms. It is not an offer
or a binding quote. Pricing, availability, and scope are confirmed in a written
agreement before work begins.

## No warranties

The site is provided as is. We do not warrant that it will be uninterrupted,
error-free, or that the information on it is complete or current.

{{IF_PROFESSIONAL_SERVICES: Content on this site is general information, not
professional advice for your specific situation.}}

## Limitation of liability

To the fullest extent permitted by law, {{BUSINESS_LEGAL_NAME}} is not liable for any
indirect, incidental, or consequential damages arising from your use of this site.

## Third-party links

The site may link to other websites. We do not control them and are not responsible
for their content or practices.

## Changes to these terms

We may revise these terms. The date at the top shows the current version. Continued
use after a change means you accept the revised terms.

## Governing law

These terms are governed by the laws of the State of {{STATE}}, {{COUNTRY}}, and any
dispute will be heard in the courts of {{COUNTY_OR_CITY}}, {{STATE}}.

## Contact

{{BUSINESS_LEGAL_NAME}}
{{STREET_ADDRESS}}
{{CITY}}, {{STATE}} {{ZIP}}
{{CONTACT_EMAIL}}
```

## Cookie consent

Required only if the site loads something non-essential: analytics, pixels, embedded
video, remarketing, or any third-party script that sets a cookie.

Determine whether a banner is needed, do not assume:

```bash
# List cookies set on first load, before any interaction
curl -sI https://{{DOMAIN}} | grep -i "set-cookie"
```

Then check in a fresh private window, devtools, Application, Cookies. If the only
cookies are the framework's own session or CSRF cookies, no banner is needed. Say so
in the handoff report rather than adding a banner with nothing to consent to.

If a banner is needed, it must:
- block non-essential scripts until consent is given, not merely announce them
- offer a reject button with the same prominence as accept
- persist the choice across pages and sessions
- link to the privacy policy
- not block the page content behind a modal with no visible dismissal

```html
<div class="cookie-banner" role="region" aria-label="Cookie consent" hidden>
  <p>
    We use analytics cookies to understand how the site is used. You can decline
    without affecting how the site works.
    <a href="/privacy">Privacy policy</a>
  </p>
  <button type="button" data-consent="reject">Decline</button>
  <button type="button" data-consent="accept">Accept analytics</button>
</div>
```

```js
const KEY = 'cookie-consent';
const stored = localStorage.getItem(KEY);

if (stored === 'accept') loadAnalytics();
else if (stored === null) document.querySelector('.cookie-banner').hidden = false;

document.querySelectorAll('[data-consent]').forEach(b => {
  b.addEventListener('click', () => {
    localStorage.setItem(KEY, b.dataset.consent);
    document.querySelector('.cookie-banner').hidden = true;
    if (b.dataset.consent === 'accept') loadAnalytics();
  });
});

function loadAnalytics() {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-{{MEASUREMENT_ID}}';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-{{MEASUREMENT_ID}}');
}
```

Verify: in a fresh private window with no consent given, devtools Network filtered to
`collect` must show zero requests. If analytics fires before the click, the banner is
decorative and the implementation is wrong.

## Footer

Every page. All three legal links present.

```html
<footer>
  <p>&copy; <span id="year"></span> {{BUSINESS_LEGAL_NAME}}. All rights reserved.</p>
  <nav aria-label="Legal">
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
    <a href="/accessibility">Accessibility</a>
  </nav>
  <address>
    {{STREET_ADDRESS}}, {{CITY}}, {{STATE}} {{ZIP}}<br>
    <a href="tel:+1{{10_DIGITS}}">{{FORMATTED_PHONE}}</a><br>
    <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>
  </address>
</footer>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>
```

The footer contains the client's copyright, legal links, and contact details. Nothing
else. No build credit, no AI badge, no "website by" link unless the client agreed to
it in writing.
