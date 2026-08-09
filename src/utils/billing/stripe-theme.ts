// Makes the payment form look like the rest of the app. Colours are read from
// the stylesheet when this runs, so never paste literal ones in — a palette
// change would leave the card fields behind.

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
 * @param is_dark - Pass the app's own dark-mode flag, not the system
 *   preference — the form has to match the panel it sits in.
 */
export function getStripeAppearance(is_dark: boolean): Appearance {
  const danger = token(is_dark ? '--color-red-600' : '--color-red-500')
  const accent = token(is_dark ? '--color-blue-650' : '--color-blue-500')

  const background = token(is_dark ? '--color-stone-900' : '--color-brown-50')
  const surface = token(is_dark ? '--color-grey-700' : '--color-brown-100')
  const surfaceHover = token(is_dark ? '--color-grey-900' : '--color-brown-200')
  const border = token(is_dark ? '--color-grey-700' : '--color-brown-300')
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
      // Pin these back to the base text colour — Stripe's own selected-tab
      // tint is too faint to read against our surface.
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
