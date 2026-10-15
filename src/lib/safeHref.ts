/**
 * Scheme allow-list for any URL that reaches an `href` from the CMS.
 *
 * Two CMS-controlled URLs are rendered as links: a portfolio company's
 * `website`, and the `url` on a lexical link node inside an article body.
 * `Portfolio.website` is already validated on save, so this is a second line
 * for that one — it still matters, because a value written by a seed script or
 * straight into the table never passes field validation. The article link is
 * the unguarded case: the rich-text editor stores whatever the link dialog was
 * given, and it was rendered into `href` as-is.
 *
 * What that allows is `javascript:alert(document.cookie)` saved by an
 * authenticated editor and executed for every visitor — stored XSS, which is
 * the shape a compromised or careless editor account takes. The site's CSP
 * does not catch it: `script-src` carries `'unsafe-inline'` for Next's inline
 * bootstrap, and that is the directive that would otherwise block
 * `javascript:` URLs.
 *
 * Parsing with `URL` rather than matching a prefix is deliberate — the WHATWG
 * parser strips tabs and newlines before reading the scheme, so the classic
 * `java&#9;script:` evasion resolves to `javascript:` here and is rejected,
 * where a `startsWith('http')` test would wave it through.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Protocol-relative (`//evil.com`) inherits the page's scheme and reads as an
  // internal path to a reviewer. Neither field has a reason to use one.
  if (trimmed.startsWith('//')) return null

  try {
    const { protocol } = new URL(trimmed)
    return protocol === 'http:' || protocol === 'https:' ? trimmed : null
  } catch {
    // No scheme at all: a same-site path or fragment, which cannot carry a
    // payload. Anything else — `mailto:`, a bare word, junk — is not a link we
    // are willing to render.
    return trimmed.startsWith('/') || trimmed.startsWith('#') ? trimmed : null
  }
}
