/**
 * Upload-time screening for SVG — specifically, the constructs Payload's own
 * check lets through.
 *
 * SVG is an XML document, not a picture: it can carry `<script>`, `on*` event
 * handlers and `<foreignObject>` with arbitrary HTML inside. None of that runs
 * inside an `<img>` tag, but it does run when the file is opened as a document —
 * a direct link to the file, or an `<object>`/`<iframe>` embed.
 *
 * WHAT THIS IS FOR, measured 2026-08-31 rather than assumed.
 *
 * Payload 3.88 screens SVG uploads itself, in `validateSvg`, and that check runs
 * *before* this collection hook — so for anything Payload catches, this module
 * never gets a turn. An earlier version of this file duplicated Payload's list
 * exactly and therefore did nothing at all: fifteen attack shapes were run
 * through both, and this module caught nothing Payload had not already caught.
 *
 * The three rules at the bottom of RULES are the ones that survived that
 * comparison — vectors Payload's check misses. That is now the whole point of
 * this module. If a future Payload starts catching them too, this becomes dead
 * weight again and should be deleted rather than kept out of politeness.
 *
 * The rules above them are kept as a regression net: they cost nothing, and they
 * are what still stands if a Payload upgrade ever weakens `validateSvg`.
 *
 * WHAT ACTUALLY HOLDS THE LINE is neither list. Media responses carry
 * `Content-Security-Policy: script-src 'none'` (pinned by
 * `tests/gates/security.spec.ts`), and that is what stops a payload *executing*.
 * This module stops one being *stored*, which matters because stored content
 * outlives the configuration protecting it — a CDN in front of the site, an
 * export of the media library, someone opening the file from disk.
 *
 * It REJECTS rather than cleans. Rejecting needs no XML parser, and it fails in
 * the safe direction: the cost of a false positive is "re-export that logo",
 * while the cost of a cleaner missing something is a live payload in the
 * library.
 *
 * KNOWN LIMIT, so nobody reads this as more than it is: matching text patterns
 * is not parsing. A determined attacker with CMS access can very likely evade
 * it. Real sanitisation needs a parser (DOMPurify over jsdom), which is a
 * dependency decision, not a code one — see security.md for why that was
 * declined.
 */

/** A construct we refuse to store, with a plain-language reason. */
type Rule = { name: string; pattern: RegExp }

const RULES: Rule[] = [
  { name: 'a <script> element', pattern: /<\s*script[\s>/]/i },
  // Attribute names only: require a separator before `on`, and `=` right after
  // the name, so values like class="online" do not trip it.
  { name: 'an inline event handler (on… attribute)', pattern: /[\s"'`]on[a-z]+\s*=/i },
  { name: 'a <foreignObject> element', pattern: /<\s*foreignObject[\s>/]/i },
  { name: 'a javascript: URL', pattern: /javascript\s*:/i },
  // SVG is XML; a declared entity is the classic XXE lever if anything
  // downstream ever expands it. A wordmark has no reason to declare one.
  { name: 'an XML entity declaration', pattern: /<!\s*ENTITY/i },

  // ---- Below here: the gaps in Payload's own validateSvg, verified 2026-08-31.
  // These three are the reason this module exists; everything above is a
  // regression net for rules Payload already enforces.

  // `<use>` pulling from another document. An internal reference — href="#id" —
  // is ordinary SVG and appears in real wordmarks, so only a target that does
  // NOT start with `#` counts. Script will not execute (the media CSP sees to
  // that), but the fetch still tells a third party who opened the file and when,
  // and it pulls unreviewed markup into a document we serve.
  {
    name: 'a <use> element pointing outside the file',
    pattern: /<\s*use\b[^>]*?\b(?:xlink:)?href\s*=\s*["']\s*(?!#)/i,
  },

  // SVG Tiny 1.2's scripting element. No current browser runs it, which is
  // exactly why nothing else screens for it — and exactly why a file carrying
  // one is not a wordmark somebody exported by accident.
  { name: 'a <handler> element', pattern: /<\s*handler[\s>/]/i },

  // `javascript:` written as HTML entities — `&#106;avascript:` and friends.
  // Payload's check matches the literal string, so an entity-encoded `j` walks
  // straight past it. Matching the encoded letter itself is the reliable tell:
  // no legitimate wordmark spells a character that way.
  {
    name: 'an entity-encoded character in a URL (obfuscated javascript:)',
    pattern: /&#x?0*(?:106|6a|74|4a);/i,
  },
]

/**
 * Returns a human-readable reason per rule the source trips, empty when clean.
 * Reasons are plural-safe and meant to be shown to an editor, not logged.
 */
export function findSvgThreats(source: string): string[] {
  return RULES.filter((rule) => rule.pattern.test(source)).map((rule) => rule.name)
}

/** Matches how Payload labels the type, and covers a mislabelled `.svg` name. */
export function isSvgUpload(mimetype: string | undefined, filename: string | undefined): boolean {
  return mimetype === 'image/svg+xml' || Boolean(filename?.toLowerCase().endsWith('.svg'))
}
