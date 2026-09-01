// Makes the payment form look like the rest of the app. Colours are read from
// the stylesheet when this runs, so never paste literal ones in — a palette
// change would leave the card fields behind.

import type { Appearance } from '@stripe/stripe-js'
import { FONT_FAMILY, FONT_URL } from '@/styles/fonts'

/** Stripe doesn't parse `color-mix()` / alpha functions — build an 8-digit hex. */
function withAlpha(hex: string, percent: number): string {
  const clean = hex.replace('#', '')
  const alpha = Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${clean}${alpha}`
}

/**
 * The colour a role resolves to for `host`.
 *
 * @param host - The element the form sits in, never the page root — reading it
 *   here is what picks up the surrounding surface, the member's colour and the
 *   current mode without any of the three being named.
 */
function role(host: HTMLElement, name: string): string {
  return getComputedStyle(host).getPropertyValue(name).trim()
}

/** The colour a role resolves to for `host` once `palette` is put on it. */
function paletteRole(host: HTMLElement, palette: string, name: string): string {
  const probe = document.createElement('span')
  probe.dataset.palette = palette
  host.appendChild(probe)

  const value = role(probe, name)
  probe.remove()

  return value
}

/**
 * How the embedded payment form should look.
 *
 * @param host - The element the form is mounted into.
 */
export function getStripeAppearance(host: HTMLElement): Appearance {
  const accent = role(host, '--color-accent')
  const danger = paletteRole(host, 'danger', '--color-accent')

  const background = role(host, '--color-well')
  const surface = role(host, '--color-surface')
  const surfaceHover = role(host, '--color-raised')
  const border = role(host, '--color-line')
  const text = role(host, '--color-ink')
  const placeholder = role(host, '--color-ink-muted')

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
      // Stripe's selected-tab tint is too faint on our surface, so pin it to base ink.
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
