import { SUPPORTED_PATTERNS } from './patterns'
import { SUPPORTED_ICONS, SUPPORTED_PALETTES } from './tokens'

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function randomCoverConfig(): DeckCover {
  return {
    palette: pick(SUPPORTED_PALETTES),
    pattern: pick(SUPPORTED_PATTERNS),
    icon: pick(SUPPORTED_ICONS)
  }
}
