import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

const PLAUSIBLE_SRC = 'https://plausible.io/js/script.manual.js'

function scriptTags() {
  return Array.from(document.head.querySelectorAll(`script[src="${PLAUSIBLE_SRC}"]`))
}

function clearInjectedScripts() {
  scriptTags().forEach((el) => el.remove())
  delete window.plausible
}

beforeEach(() => {
  vi.resetModules()
  clearInjectedScripts()
})

afterEach(() => {
  vi.unstubAllEnvs()
  clearInjectedScripts()
})

describe('trackPageview', () => {
  test('does nothing when VITE_PLAUSIBLE_DOMAIN is unset [obligation]', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', '')
    const { trackPageview } = await import('@/utils/analytics/plausible')

    trackPageview()

    expect(scriptTags()).toHaveLength(0)
    expect(window.plausible).toBeUndefined()
  })

  test('injects the manual-pageview script and fires a pageview when the domain is set [obligation]', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'taroflash.app')
    const { trackPageview } = await import('@/utils/analytics/plausible')

    trackPageview()

    const scripts = scriptTags()
    expect(scripts).toHaveLength(1)
    expect(scripts[0].dataset.domain).toBe('taroflash.app')
    expect(scripts[0].src).toBe(PLAUSIBLE_SRC)
    expect(window.plausible?.q).toContainEqual(['pageview'])
  })

  test('injects the script only once across repeated calls, but fires a pageview every time [obligation]', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_DOMAIN', 'taroflash.app')
    const { trackPageview } = await import('@/utils/analytics/plausible')

    trackPageview()
    trackPageview()

    expect(scriptTags()).toHaveLength(1)
    expect(window.plausible?.q).toEqual([['pageview'], ['pageview']])
  })
})
