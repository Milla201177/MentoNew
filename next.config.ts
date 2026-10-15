import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/**
 * Content-Security-Policy for the public pages.
 *
 * The site loads nothing from a third party at runtime — no analytics, no CDN,
 * no external fonts since DM Sans and Inter became self-hosted — so every
 * directive below can be `'self'` and stay there. That is what makes a policy
 * worth shipping here at all.
 *
 * `script-src` is the exception, and the reason this took so long to land.
 * Next puts ten inline <script> tags on a prerendered page (the flight payload
 * that hydration reads). Forbidding inline script would break the site, and the
 * two ways around it both cost something real:
 *
 *   - a per-request nonce needs middleware on every request, which opts every
 *     page out of static generation. `/` and `/articles` are fully prerendered
 *     today; that is not a trade worth making for this.
 *   - hashing the inline blocks means regenerating hashes on every build, since
 *     Next rewrites the payload whenever the page changes.
 *
 * So `'unsafe-inline'` stays in the enforced policy, and the strict version
 * ships alongside it as Report-Only. Be clear about what that buys: the
 * enforced policy stops an injected `<script src="https://evil/">`, stops
 * exfiltration to any other origin (`connect-src`, `form-action`), and stops a
 * `<base>` tag rewriting every relative URL on the page. It does NOT stop
 * inline injection — that is what the Report-Only policy is there to measure a
 * path towards.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ADDING ANALYTICS, A TAG MANAGER, A CHAT WIDGET, EMBEDDED VIDEO, OR ANY OTHER
 * THIRD-PARTY SCRIPT? READ THIS FIRST.
 *
 * Both policies say `'self'`, so the browser will refuse to load the vendor's
 * script and refuse to send it any events. The failure is quiet in the way that
 * costs the most time: the site keeps working, nothing looks broken, and the
 * vendor's dashboard just stays empty until somebody opens a console weeks
 * later.
 *
 * The vendor's domains have to be added HERE, in the SAME change that adds the
 * script — not afterwards. Typically:
 *
 *   script-src   the domain the tag is served from
 *   connect-src  the domain events are POSTed to (often a different one)
 *   img-src      only if the vendor still uses a tracking pixel
 *   frame-src    only for embeds — video, maps, a booking widget
 *
 * Plausible needs `https://plausible.io` in both script-src and connect-src.
 * Google Analytics needs three domains (googletagmanager.com,
 * google-analytics.com, analytics.google.com) plus an img-src entry.
 *
 * Worth knowing what would be given up: as written, this policy is a technical
 * guarantee that nothing leaves a visitor's browser for anyone but us. For a
 * fund with UK and EU investors that is a real thing to be able to say. Adding
 * a vendor narrows the guarantee to exactly the domains listed below — still
 * worth having, because it keeps the list of who receives visitor data in one
 * reviewable place instead of scattered across components.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const CSP_ENFORCED = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Modern equivalent of X-Frame-Options, which is kept below for older browsers.
  "frame-ancestors 'none'",
  "form-action 'self'",
  // `data:` for inlined SVG icons, `blob:` for client-side image work.
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // GSAP writes inline styles as it animates, so this one cannot be tightened
  // without rewriting every animation onto classes.
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

/**
 * The policy we would like to enforce, reported on but not applied. Watch the
 * violation reports over real traffic before promoting any of this — the
 * observation window is calendar time on real visitors, not work time.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // The one difference that matters: no 'unsafe-inline'. Expect this to report
  // Next's hydration scripts until they are nonced or hashed.
  "script-src 'self'",
  "connect-src 'self'",
].join('; ')

const nextConfig: NextConfig = {
  // Advertises the framework and CMS to any scanner that asks. Payload appends
  // itself to Next's header, and setting this false makes it skip that too —
  // one flag removes the whole "Next.js, Payload" string.
  poweredByHeader: false,
  // Without this, Turbopack bundles sharp instead of leaving it external, and
  // its native libvips binary doesn't make it into the Vercel function output
  // (ERR_DLOPEN_FAILED at runtime on /admin and any image-processing route).
  serverExternalPackages: ['sharp'],
  // Turbopack's output tracing doesn't follow sharp's dlopen'd libvips binary,
  // so it gets dropped from the deployed function unless explicitly included.
  outputFileTracingIncludes: {
    '/admin/**/*': ['./node_modules/@img/**/*'],
    '/api/**/*': ['./node_modules/@img/**/*'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  /**
   * Short links on the site's own domain that forward somewhere else.
   *
   * Kept here rather than in the Vercel dashboard so they are versioned,
   * reviewed and rolled back like any other change, and so the list of places
   * the domain sends people is readable in one spot.
   *
   * `permanent: false` on purpose. A 308 is cached by the browser indefinitely,
   * so if the target ever changes — a new form for the next fund, a different
   * provider — everyone who had already followed the link would keep landing
   * on the old one, with no way to reach them. A 307 is re-asked every time
   * and costs one extra round trip nobody will notice on a form link.
   *
   * Query strings pass through to the destination (Next does this for every
   * redirect), so `?utm_source=…` on the short link reaches the form intact.
   */
  async redirects() {
    return [
      {
        source: '/fund2form',
        destination: 'https://form.typeform.com/to/RLJOfdOt',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        // Applied everywhere, including the admin. The CSP below deliberately
        // is not — see the next block for why.
        source: '/:path*',
        headers: [
          // The admin lives at a predictable path, so framing it is the cheap
          // way to clickjack a logged-in editor into destructive clicks.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Media is user-uploadable; never let a browser second-guess the
          // Content-Type we send for it.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // No route asks for a camera, mic or location. Say so explicitly so
          // an injected iframe cannot ask on our behalf.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // CSP on the public pages ONLY. `/admin` and `/api` are excluded by the
        // negative lookahead, and that exclusion is the point: the admin is a
        // third-party bundle we do not control, and Payload's Monaco editor
        // pulls tricks — web workers, generated functions — that a policy
        // written for our own pages would break. Locking down the admin is a
        // separate job with its own testing, not a side effect of this one.
        source: '/((?!admin|api).*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP_ENFORCED },
          { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
        ],
      },
      {
        // Keep the CMS out of search results. It is not a secret — the login
        // form is meant to be reachable — but indexing it advertises the
        // install and competes with real content.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

const withPayloadConfig = withPayload(nextConfig, { devBundleServerPackages: false })

/**
 * Confine Payload's client-hint headers to the admin panel.
 *
 * `withPayload` appends its own header block at `source: '/:path*'` carrying
 * `Accept-CH`, `Vary` and `Critical-CH: Sec-CH-Prefers-Color-Scheme`. The admin
 * needs them — they are how it server-renders in the visitor's colour scheme
 * without a flash of the wrong theme.
 *
 * `Critical-CH` is not a hint, it is an instruction: it tells the browser the
 * response depends on a header it did not send, so the browser THROWS AWAY the
 * navigation and starts it again. Applied site-wide, that costs every
 * first-time visitor a full extra round trip to the homepage. Measured on the
 * live site: Lighthouse attributes 1344 ms to it on throttled mobile, more than
 * render-blocking CSS, and a browser trace shows two navigations to `/` where
 * `curl` sees one 200.
 *
 * The public pages have no use for it — there is no dark mode anywhere on the
 * site, and no rule reads `prefers-color-scheme`. So the block is re-pointed at
 * `/admin/:path*` rather than removed: Payload keeps the behaviour where it
 * matters, and the marketing pages stop paying for it.
 *
 * Done by rewriting the array `withPayload` produced, because it offers no
 * option for this and Next merges all matching header rules — an override in
 * our own `headers()` above could not have removed it.
 */
const CLIENT_HINT_KEYS = new Set(['accept-ch', 'critical-ch'])

export default {
  ...withPayloadConfig,
  headers: async () => {
    const rules = (await withPayloadConfig.headers?.()) ?? []
    return rules.map((rule) =>
      rule.source === '/:path*' && rule.headers.some((h) => CLIENT_HINT_KEYS.has(h.key.toLowerCase()))
        ? { ...rule, source: '/admin/:path*' }
        : rule,
    )
  },
}
