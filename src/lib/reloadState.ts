export const RELOAD_STATE_KEY = 'mento:reload-position'

export type ReloadState = {
  path: string
  scrollY: number
  expanded: boolean
  view: 'list' | 'grid'
}

/** Restore only a reload of this page, never a fresh visit or another route. */
export function readReloadState(): ReloadState | null {
  if (typeof window === 'undefined') return null
  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined
  if (navigation?.type !== 'reload') return null
  try {
    const state = JSON.parse(sessionStorage.getItem(RELOAD_STATE_KEY) || 'null')
    if (
      !state ||
      state.path !== location.pathname + location.search ||
      !Number.isFinite(state.scrollY) ||
      state.scrollY < 0 ||
      typeof state.expanded !== 'boolean' ||
      !['list', 'grid'].includes(state.view)
    )
      return null
    return state
  } catch {
    return null
  }
}

/** Storage may be disabled in private or restricted browsing sessions. */
export function saveReloadState(state: ReloadState): void {
  try {
    sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(state))
  } catch {
    // Navigation remains available without persistence.
  }
}
