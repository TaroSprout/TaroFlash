import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

const SITE_ID = 'pa-8mf8Xc6JDbJ3SFPBHKhKu'
const PLAUSIBLE_SRC = `https://plausible.io/js/${SITE_ID}.js`

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
  test('does nothing when VITE_PLAUSIBLE_SITE_ID is unset', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_SITE_ID', '')
    const { trackPageview } = await import('@/utils/analytics/plausible')

    trackPageview()

    expect(scriptTags()).toHaveLength(0)
    expect(window.plausible).toBeUndefined()
  })

  test('injects the per-site script, disables autocapture, and fires a pageview when the site id is set', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_SITE_ID', SITE_ID)
    const { trackPageview } = await import('@/utils/analytics/plausible')

    trackPageview()

    const scripts = scriptTags()
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe(PLAUSIBLE_SRC)
    expect(scripts[0].async).toBe(true)
    expect(window.plausible?.o).toEqual({ autoCapturePageviews: false })
    expect(window.plausible?.q).toContainEqual(['pageview'])
  })

  test('injects the script only once across repeated calls, but fires a pageview every time', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_SITE_ID', SITE_ID)
    const { trackPageview } = await import('@/utils/analytics/plausible')

    trackPageview()
    trackPageview()

    expect(scriptTags()).toHaveLength(1)
    expect(window.plausible?.q).toEqual([['pageview'], ['pageview']])
  })
})

describe('trackEvent', () => {
  test('does nothing when VITE_PLAUSIBLE_SITE_ID is unset', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_SITE_ID', '')
    const { trackEvent } = await import('@/utils/analytics/plausible')

    trackEvent('Signup Started')

    expect(scriptTags()).toHaveLength(0)
    expect(window.plausible).toBeUndefined()
  })

  test('fires the named event once the site id is set', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_SITE_ID', SITE_ID)
    const { trackEvent } = await import('@/utils/analytics/plausible')

    trackEvent('Signup Completed')

    expect(window.plausible?.q).toContainEqual(['Signup Completed'])
  })

  test('never sends a second argument alongside the event name', async () => {
    vi.stubEnv('VITE_PLAUSIBLE_SITE_ID', SITE_ID)
    const { trackEvent } = await import('@/utils/analytics/plausible')

    trackEvent('Signup Started')

    const call = window.plausible?.q?.find((args) => args[0] === 'Signup Started')
    expect(call).toHaveLength(1)
  })
})
