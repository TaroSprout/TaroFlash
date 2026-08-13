import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { getStripeAppearance, STRIPE_FONTS } from '@/utils/billing/stripe-theme'

const HOST_TOKENS = {
  '--color-accent': '#3b82f6',
  '--color-well': '#fdf6ec',
  '--color-surface': '#f5e9d6',
  '--color-raised': '#ecd9bc',
  '--color-line': '#e0c49a',
  '--color-ink': '#5c4530',
  '--color-ink-muted': '#9c7b52'
}

const DANGER_ACCENT = '#e11d48'

let host

beforeEach(() => {
  host = document.createElement('div')
  Object.entries(HOST_TOKENS).forEach(([name, value]) => host.style.setProperty(name, value))
  document.body.appendChild(host)

  // The host's own accent stands in for a caller-set --theme-primary; the
  // danger probe below deliberately gets a different value so a test can
  // tell whether colorDanger came from the probe or leaked from the host.
  const style = document.createElement('style')
  style.textContent = `[data-palette='danger'] { --color-accent: ${DANGER_ACCENT}; }`
  document.head.appendChild(style)
})

afterEach(() => {
  host.remove()
})

describe('getStripeAppearance — reads colours off the host element', () => {
  test('reads accent, background, surface, border, text and placeholder off the given host', () => {
    const appearance = getStripeAppearance(host)

    expect(appearance.variables.colorPrimary).toBe(HOST_TOKENS['--color-accent'])
    expect(appearance.variables.colorBackground).toBe(HOST_TOKENS['--color-well'])
    expect(appearance.variables.colorText).toBe(HOST_TOKENS['--color-ink'])
    expect(appearance.variables.colorTextPlaceholder).toBe(HOST_TOKENS['--color-ink-muted'])
    expect(appearance.rules['.Tab--selected'].backgroundColor).toBe(HOST_TOKENS['--color-surface'])
    expect(appearance.rules['.Tab:hover'].backgroundColor).toBe(HOST_TOKENS['--color-raised'])
    expect(appearance.rules['.Input'].border).toContain(HOST_TOKENS['--color-line'])
  })

  test('does not read colours off document.documentElement', () => {
    document.documentElement.style.setProperty('--color-accent', '#000000')
    document.documentElement.style.setProperty('--color-well', '#000000')

    const appearance = getStripeAppearance(host)

    expect(appearance.variables.colorPrimary).toBe(HOST_TOKENS['--color-accent'])
    expect(appearance.variables.colorBackground).toBe(HOST_TOKENS['--color-well'])

    document.documentElement.style.removeProperty('--color-accent')
    document.documentElement.style.removeProperty('--color-well')
  })

  test('colorDanger comes from a data-palette="danger" probe, not the host’s own accent', () => {
    const appearance = getStripeAppearance(host)

    expect(appearance.variables.colorDanger).toBe(DANGER_ACCENT)
    expect(appearance.variables.colorDanger).not.toBe(HOST_TOKENS['--color-accent'])
  })

  test('leaves no probe node behind on the host after resolving colorDanger', () => {
    getStripeAppearance(host)

    expect(host.children).toHaveLength(0)
  })
})

describe('getStripeAppearance — static shape', () => {
  test('always returns the flat theme, above labels, and condensed inputs', () => {
    const appearance = getStripeAppearance(host)

    expect(appearance.theme).toBe('flat')
    expect(appearance.labels).toBe('above')
    expect(appearance.inputs).toBe('condensed')
  })

  test('builds an 8-digit alpha hex for the focused Input box-shadow', () => {
    const appearance = getStripeAppearance(host)

    expect(appearance.rules['.Input:focus'].boxShadow).toContain(
      `${HOST_TOKENS['--color-accent']}40`
    )
  })

  test('pins selected-tab label/icon color back to the base text color', () => {
    const appearance = getStripeAppearance(host)

    expect(appearance.rules['.TabLabel--selected'].color).toBe(HOST_TOKENS['--color-ink'])
    expect(appearance.rules['.TabIcon--selected'].color).toBe(HOST_TOKENS['--color-ink'])
  })
})

describe('STRIPE_FONTS', () => {
  test('exports a single custom font source entry', () => {
    expect(STRIPE_FONTS).toHaveLength(1)
    expect(STRIPE_FONTS[0]).toHaveProperty('cssSrc')
  })
})
