import { afterEach, expect, it, vi } from 'vitest'
import { readReloadState, RELOAD_STATE_KEY, saveReloadState } from '../../src/lib/reloadState'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

const saved = {
  path: location.pathname + location.search,
  scrollY: 2100,
  expanded: true,
  view: 'grid',
}

it('restores a reload with its position and expanded grid state', () => {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type: 'reload' },
  ] as unknown as PerformanceEntry[])
  sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(saved))
  expect(readReloadState()).toEqual(saved)
})

it('does not restore a new visit or another route', () => {
  const navigation = vi.spyOn(performance, 'getEntriesByType')
  navigation.mockReturnValue([{ type: 'navigate' }] as unknown as PerformanceEntry[])
  sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(saved))
  expect(readReloadState()).toBeNull()
  navigation.mockReturnValue([{ type: 'reload' }] as unknown as PerformanceEntry[])
  sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify({ ...saved, path: '/another-page' }))
  expect(readReloadState()).toBeNull()
})

it('ignores malformed or unavailable session storage', () => {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type: 'reload' },
  ] as unknown as PerformanceEntry[])
  sessionStorage.setItem(RELOAD_STATE_KEY, 'broken JSON')
  expect(readReloadState()).toBeNull()
  sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify({ ...saved, scrollY: -1 }))
  expect(readReloadState()).toBeNull()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('disabled')
  })
  expect(readReloadState()).toBeNull()
})

it('writes a valid state and tolerates disabled storage', () => {
  saveReloadState({ ...saved, view: 'grid' })
  expect(JSON.parse(sessionStorage.getItem(RELOAD_STATE_KEY)!)).toEqual(saved)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('disabled')
  })
  expect(() => saveReloadState({ ...saved, view: 'grid' })).not.toThrow()
})
