// Shared Appearance config for the Stripe Payment Element — reused by the
// initial checkout flow and the add-credit-card modal so both share the same
// colors, typography, and control styles as the rest of the app.
//
// Colors are resolved from Tailwind's :root CSS variables at call time so a
// palette tweak propagates everywhere without another hand-edit here.

import type { Appearance } from '@stripe/stripe-js'
import { FONT_FAMILY, FONT_URL } from '@/styles/fonts'

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Stripe doesn't parse `color-mix()` / alpha functions — build an 8-digit hex. */
function withAlpha(hex: string, percent: number): string {
  const clean = hex.replace('#', '')
  const alpha = Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${clean}${alpha}`
}

/**
 * Builds the shared Payment Element appearance, in either light or dark
 * palette. `is_dark` should mirror the app's own `useThemeStore().is_dark`
 * so the Stripe form always matches the surrounding modal chrome.
 */
export function getStripeAppearance(is_dark: boolean): Appearance {
  const green600 = token('--color-green-600')
  const red600 = token('--color-red-600')

  const background = token(is_dark ? '--color-grey-800' : '--color-brown-50')
  const surface = token(is_dark ? '--color-grey-700' : '--color-brown-100')
  const surfaceHover = token(is_dark ? '--color-grey-900' : '--color-brown-200')
  const border = token(is_dark ? '--color-grey-700' : '--color-brown-300')
  const text = token(is_dark ? '--color-grey-300' : '--color-brown-700')
  const placeholder = token(is_dark ? '--color-grey-500' : '--color-brown-500')

  return {
    theme: 'flat',
    labels: 'floating',
    variables: {
      colorPrimary: green600,
      colorBackground: background,
      colorText: text,
      colorDanger: red600,
      colorTextPlaceholder: placeholder,
      fontFamily: FONT_FAMILY,
      fontSizeBase: '14px',
      // "condensed" inputs — Stripe's appearance API has no dedicated input-
      // density flag, and spacingUnit alone doesn't shrink input padding, so
      // the actual height reduction happens via explicit rules below.
      spacingUnit: '2px',
      gridRowSpacing: '8px',
      gridColumnSpacing: '8px',
      tabSpacing: '8px',
      borderRadius: '8px'
    },
    rules: {
      '.Input': {
        border: `1px solid ${border}`,
        boxShadow: 'none',
        padding: '8px 10px'
      },
      '.Input:focus': {
        border: `1px solid ${green600}`,
        boxShadow: `0 0 0 3px ${withAlpha(green600, 25)}`
      },
      '.Label': {
        color: text,
        fontWeight: '500'
      },
      '.Tab': {
        border: `1px solid ${border}`,
        backgroundColor: background,
        padding: '8px 10px'
      },
      '.Tab:hover': {
        backgroundColor: surfaceHover
      },
      '.Tab--selected': {
        borderColor: green600,
        backgroundColor: surface
      }
    }
  }
}

export const STRIPE_FONTS = [{ cssSrc: FONT_URL }]
