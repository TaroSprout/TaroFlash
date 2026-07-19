// Shared Appearance config for the Stripe Payment Element — reused by the
// initial checkout flow and the change-card modal so both share the same
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
  const danger = token(is_dark ? '--color-red-600' : '--color-red-500')
  const accent = token(is_dark ? '--color-blue-650' : '--color-blue-500')

  const background = token(is_dark ? '--color-stone-900' : '--color-brown-50')
  const surface = token(is_dark ? '--color-stone-500' : '--color-brown-100')
  const surfaceHover = token(is_dark ? '--color-stone-950' : '--color-brown-200')
  const border = token(is_dark ? '--color-stone-500' : '--color-brown-300')
  const text = token(is_dark ? '--color-brown-300' : '--color-brown-700')
  const placeholder = token(is_dark ? '--color-brown-500' : '--color-brown-500')

  return {
    theme: 'flat',
    labels: 'above',
    inputs: 'condensed',
    variables: {
      colorPrimary: accent,
      colorBackground: background,
      colorText: text,
      colorDanger: danger,
      colorTextPlaceholder: placeholder,
      fontFamily: FONT_FAMILY,
      borderRadius: '8px'
    },
    rules: {
      '.Input': {
        border: `1px solid ${border}`,
        boxShadow: 'none'
      },
      '.Input:focus': {
        border: `1px solid ${accent}`,
        boxShadow: `0 0 0 3px ${withAlpha(accent, 25)}`
      },
      '.Label': {
        color: text,
        fontWeight: '500'
      },
      '.Tab': {
        border: `1px solid ${border}`,
        backgroundColor: background
      },
      '.Tab:hover': {
        backgroundColor: surfaceHover
      },
      '.Tab--selected': {
        borderColor: accent,
        backgroundColor: surface
      },
      // Selected-tab label/icon default to a primary-tinted color that reads
      // low-contrast against the surface — pin them back to the base text color.
      '.TabLabel--selected': {
        color: text
      },
      '.TabIcon--selected': {
        color: text
      }
    }
  }
}

export const STRIPE_FONTS = [{ cssSrc: FONT_URL }]
