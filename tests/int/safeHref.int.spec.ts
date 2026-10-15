import { describe, expect, it } from 'vitest'
import { safeHref } from '@/lib/safeHref'

describe('safeHref', () => {
  it('passes ordinary web addresses through unchanged', () => {
    for (const url of [
      'https://example.com',
      'http://example.com/path?q=1#frag',
      'https://www.linkedin.com/in/someone/',
    ]) {
      expect(safeHref(url)).toBe(url)
    }
  })

  it('allows same-site paths and fragments', () => {
    expect(safeHref('/articles')).toBe('/articles')
    expect(safeHref('#sectionFocus')).toBe('#sectionFocus')
  })

  it('rejects script-bearing schemes', () => {
    expect(safeHref('javascript:alert(document.cookie)')).toBeNull()
    expect(safeHref('JavaScript:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeHref('vbscript:msgbox(1)')).toBeNull()
  })

  it('rejects the whitespace-obfuscated javascript scheme', () => {
    // The WHATWG URL parser strips these before reading the scheme, which is
    // the whole reason this is not a prefix match.
    expect(safeHref('java\tscript:alert(1)')).toBeNull()
    expect(safeHref('java\nscript:alert(1)')).toBeNull()
    expect(safeHref('  javascript:alert(1)  ')).toBeNull()
  })

  it('rejects protocol-relative URLs, which read as internal paths', () => {
    expect(safeHref('//evil.example')).toBeNull()
  })

  it('rejects empty and non-URL values', () => {
    expect(safeHref(undefined)).toBeNull()
    expect(safeHref(null)).toBeNull()
    expect(safeHref('')).toBeNull()
    expect(safeHref('   ')).toBeNull()
    expect(safeHref('example.com')).toBeNull()
    expect(safeHref('mailto:a@b.c')).toBeNull()
  })
})
