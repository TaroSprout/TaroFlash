export type CardWidthToken = 'full' | 'md' | 'sm' | 'xs' | '2xs'

/**
 * Reads a card width from the stylesheet, for the layout maths that needs the
 * number. Call this rather than copying the value — the stylesheet is where a
 * card width is actually decided.
 */
export function cardWidthPx(token: CardWidthToken): number {
  const root_styles = getComputedStyle(document.documentElement)
  return parseFloat(root_styles.getPropertyValue(`--card-w-${token}`))
}
