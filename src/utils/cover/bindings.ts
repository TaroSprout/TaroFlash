import { COVER_PATTERNS } from './patterns'
import { BORDER_SIZE_PX } from './tokens'

export type CoverBindingsOptions = {
  fallbackPalette?: PaletteName
  pattern?: boolean
  border?: boolean
  /** Flat opacity override (both modes unless `patternOpacityDark` is set). Falls back to `COVER_PATTERNS[pattern].opacity`. */
  patternOpacity?: string
  /** Dark-mode opacity override. Falls back to `patternOpacity`, then `COVER_PATTERNS[pattern].opacityDark`. */
  patternOpacityDark?: string
  /** Flat tile-size override (any CSS length). Falls back to `COVER_PATTERNS[pattern].size`. */
  patternSize?: string
}

export type CoverBindings = {
  'data-palette': PaletteName | undefined
  class: string[]
  style: Record<string, string>
}

export function coverBindings(
  config?: DeckCover,
  options: CoverBindingsOptions = {}
): CoverBindings {
  const { fallbackPalette, pattern = true, border = true } = options

  return {
    'data-palette': config?.palette ?? fallbackPalette,
    class: pattern && config?.pattern ? ['pattern-mask'] : [],
    style: {
      ...(pattern && config?.pattern ? buildPatternStyle(config.pattern, options) : {}),
      ...(border && config ? buildBorderStyle() : {})
    }
  }
}

function buildPatternStyle(
  pattern: DeckCoverPattern,
  options: CoverBindingsOptions
): Record<string, string> {
  const token = COVER_PATTERNS[pattern]

  return {
    '--bgx-image': `var(--bgx-${pattern})`,
    '--bgx-fill': 'var(--color-brown-100)',
    '--bgx-opacity-light': options.patternOpacity ?? token.opacity,
    '--bgx-opacity-dark': options.patternOpacityDark ?? options.patternOpacity ?? token.opacityDark,
    '--bgx-size': options.patternSize ?? token.size
  }
}

function buildBorderStyle(): Record<string, string> {
  return {
    border: `${BORDER_SIZE_PX}px solid var(--color-accent)`
  }
}
