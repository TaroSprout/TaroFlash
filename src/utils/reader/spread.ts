export const PAGE_WIDTH = 440
export const SPREAD_GAP = 40
export const TWO_PAGE_MIN_WIDTH = 2 * PAGE_WIDTH + SPREAD_GAP

export type SpreadSlot = {
  page_index: number
  primary: boolean
}

export function isTwoPage(viewport_width: number): boolean {
  return viewport_width >= TWO_PAGE_MIN_WIDTH
}

export function pageWidth(viewport_width: number, two_page: boolean): number {
  return two_page ? Math.max(0, (viewport_width - SPREAD_GAP) / 2) : viewport_width
}

export function spreadCount(page_count: number, two_page: boolean): number {
  if (page_count <= 0) return 0
  return two_page ? Math.ceil(page_count / 2) : page_count
}

export function spreadOfPage(page_index: number, two_page: boolean): number {
  if (page_index < 0) return 0
  return two_page ? Math.floor(page_index / 2) : page_index
}

export function slotsForSpread(
  spread: number,
  page_count: number,
  two_page: boolean
): SpreadSlot[] {
  if (!two_page) {
    return spread < page_count ? [{ page_index: spread, primary: true }] : []
  }

  const primary = spread * 2
  const secondary = spread * 2 + 1

  const slots: SpreadSlot[] = []
  if (primary < page_count) slots.push({ page_index: primary, primary: true })
  if (secondary < page_count) slots.push({ page_index: secondary, primary: false })

  return slots
}
