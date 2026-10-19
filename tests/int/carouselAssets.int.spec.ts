import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('keeps generated carousel SVGs valid XML, including embedded-image namespaces', () => {
  for (const directory of ['about-logos', 'about-logos-mobile']) {
    const root = resolve('public/portfolio', directory)
    for (const filename of readdirSync(root).filter((file) => file.endsWith('.svg'))) {
      const source = readFileSync(resolve(root, filename), 'utf8')
      const document = new DOMParser().parseFromString(source, 'image/svg+xml')
      expect(document.querySelector('parsererror'), `${directory}/${filename}`).toBeNull()
      expect(document.documentElement.getAttribute('viewBox')).toBe('0 0 400 112')
    }
  }
})
