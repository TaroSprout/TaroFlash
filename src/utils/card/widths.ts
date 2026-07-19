export type CardWidthToken = 'full' | 'md' | 'sm' | 'xs' | '2xs'

/**
 * Resolve a `--card-w-<token>` width token to its px number. Single source of
 * truth for card widths lives in main.css; use this where layout math needs
 * the number (e.g. grid cell geometry) instead of mirroring the px value.
 */
export function cardWidthPx(token: CardWidthToken): number {
  const root_styles = getComputedStyle(document.documentElement)
  return parseFloat(root_styles.getPropertyValue(`--card-w-${token}`))
}
