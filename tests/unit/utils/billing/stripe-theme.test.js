import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { getStripeAppearance, STRIPE_FONTS } from '@/utils/billing/stripe-theme'

const TOKENS = {
  '--color-red-500': '#e11d48',
  '--color-red-600': '#be123c',
  '--color-blue-500': '#3b82f6',
  '--color-blue-650': '#1d4ed8',
  '--color-stone-900': '#1c1917',
  '--color-grey-700': '#374151',
  '--color-grey-900': '#111827',
  '--color-brown-50': '#fdf6ec',
  '--color-brown-100': '#f5e9d6',
  '--color-brown-200': '#ecd9bc',
  '--color-brown-300': '#e0c49a',
  '--color-brown-700': '#5c4530',
  '--color-brown-500': '#9c7b52'
}

beforeEach(() => {
  Object.entries(TOKENS).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value)
  })
})

afterEach(() => {
  Object.keys(TOKENS).forEach((name) => document.documentElement.style.removeProperty(name))
})

describe('getStripeAppearance — light/dark token selection', () => {
  test('resolves the light-mode danger and accent colors when is_dark is false', () => {
    const appearance = getStripeAppearance(false)

    expect(appearance.variables.colorDanger).toBe(TOKENS['--color-red-500'])
    expect(appearance.variables.colorPrimary).toBe(TOKENS['--color-blue-500'])
    expect(appearance.variables.colorBackground).toBe(TOKENS['--color-brown-50'])
    expect(appearance.variables.colorText).toBe(TOKENS['--color-brown-700'])
  })

  test('resolves the dark-mode danger and accent colors when is_dark is true', () => {
    const appearance = getStripeAppearance(true)

    expect(appearance.variables.colorDanger).toBe(TOKENS['--color-red-600'])
    expect(appearance.variables.colorPrimary).toBe(TOKENS['--color-blue-650'])
    expect(appearance.variables.colorBackground).toBe(TOKENS['--color-stone-900'])
    expect(appearance.variables.colorText).toBe(TOKENS['--color-brown-300'])
  })
})

describe('getStripeAppearance — static shape', () => {
  test('always returns the flat theme, above labels, and condensed inputs', () => {
    const appearance = getStripeAppearance(false)

    expect(appearance.theme).toBe('flat')
    expect(appearance.labels).toBe('above')
    expect(appearance.inputs).toBe('condensed')
  })

  test('builds an 8-digit alpha hex for the focused Input box-shadow', () => {
    const appearance = getStripeAppearance(false)

    expect(appearance.rules['.Input:focus'].boxShadow).toContain(`${TOKENS['--color-blue-500']}40`)
  })

  test('pins selected-tab label/icon color back to the base text color', () => {
    const appearance = getStripeAppearance(false)

    expect(appearance.rules['.TabLabel--selected'].color).toBe(TOKENS['--color-brown-700'])
    expect(appearance.rules['.TabIcon--selected'].color).toBe(TOKENS['--color-brown-700'])
  })
})

describe('STRIPE_FONTS', () => {
  test('exports a single custom font source entry', () => {
    expect(STRIPE_FONTS).toHaveLength(1)
    expect(STRIPE_FONTS[0]).toHaveProperty('cssSrc')
  })
})
