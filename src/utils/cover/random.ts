import { SUPPORTED_PATTERNS } from './patterns'
import { SUPPORTED_ICONS, SUPPORTED_THEMES } from './tokens'

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function randomCoverConfig(): DeckCover {
  const theme = pick(SUPPORTED_THEMES)
  return {
    theme: theme.light,
    theme_dark: theme.dark,
    pattern: pick(SUPPORTED_PATTERNS),
    icon: pick(SUPPORTED_ICONS)
  }
}
