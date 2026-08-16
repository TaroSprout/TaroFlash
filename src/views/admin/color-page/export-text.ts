// The text an admin pastes into the stylesheet by hand. This is the only way a tuned value ever
// reaches the product — the page writes no CSS of its own.

import {
  ACCENT_FAMILIES,
  MODES,
  NEUTRAL_FAMILIES,
  PALETTE_BINDINGS,
  PALETTE_ROLES,
  ROLE_NAMES,
  STATIONS,
  type Mode,
  type StationName
} from './catalog'
import { SHIPPED_FAMILY, SHIPPED_HEX, SHIPPED_NAME } from './state'
import type { ColorTuner } from './use-color-tuner'

// Copied selector-for-selector from `src/styles/stations.css`; a block whose selector doesn't match
// the one already there lands as a second, weaker rule instead of replacing anything.
const SELECTORS: Record<Mode, Record<StationName, string>> = {
  light: {
    page: "[data-station='page']",
    panel: "[data-station='panel']",
    window: "[data-station='window']",
    float: "[data-station='float']"
  },
  dark: {
    page: ":root[data-mode='dark'],\n[data-mode='dark'] [data-station='page'],\n[data-mode='dark'][data-station='page']",
    panel: "[data-mode='dark'] [data-station='panel'],\n[data-mode='dark'][data-station='panel']",
    window:
      "[data-mode='dark'] [data-station='window'],\n[data-mode='dark'][data-station='window']",
    float: "[data-mode='dark'] [data-station='float'],\n[data-mode='dark'][data-station='float']"
  }
}

const STATION_STEPS = [
  'Paste the @theme block into src/styles/main.css, over the shade lines it repeats.',
  'Paste each station block into src/styles/stations.css, over the block with the same selector.'
]

// An identity family's hexes live in main.css beside the neutrals; the registry only says which
// shade name a palette reaches for, so a recolour never touches it and a rename always does.
const ACCENT_STEPS = [
  'Paste the @theme block into src/styles/main.css, over the shade lines it repeats.',
  'Paste any palette entries into PALETTES in src/utils/palette/registry.ts, then run',
  '`pnpm gen:palette-css` so src/styles/palettes.gen.css picks the new names up.',
  'A shade that only changed colour needs no registry edit — its palette still binds it by name.'
]

export function buildExportText(tuner: ColorTuner): string {
  return [stationSection(tuner), accentSection(tuner)].join('\n\n')
}

function stationSection(tuner: ColorTuner): string {
  return [
    steps('Stations', STATION_STEPS),
    themeBlock(tuner, NEUTRAL_FAMILIES),
    ...MODES.flatMap((mode) => STATIONS.map((station) => stationBlock(tuner, mode, station))),
    changedShadeList(tuner, NEUTRAL_FAMILIES),
    addedShadeList(tuner, NEUTRAL_FAMILIES),
    removedShadeList(tuner, NEUTRAL_FAMILIES)
  ].join('\n\n')
}

function accentSection(tuner: ColorTuner): string {
  const touched = ACCENT_FAMILIES.filter((family) => isFamilyTouched(tuner, family))

  return [
    steps('Identities', ACCENT_STEPS),
    themeBlock(tuner, touched),
    paletteBlock(tuner),
    changedShadeList(tuner, ACCENT_FAMILIES),
    addedShadeList(tuner, ACCENT_FAMILIES),
    removedShadeList(tuner, ACCENT_FAMILIES)
  ].join('\n\n')
}

function isFamilyTouched(tuner: ColorTuner, family: string): boolean {
  const live = (tuner.families.value.get(family) ?? []).some(
    (shade) => !SHIPPED_HEX.has(shade.id) || !tuner.isShadeShipped(shade)
  )

  return live || removedNames(tuner, [family]).length > 0
}

function themeBlock(tuner: ColorTuner, families: string[]): string {
  const lines = families.flatMap((family) => [
    `  /* ${family} */`,
    ...(tuner.families.value.get(family) ?? []).map((shade) => {
      const hex = tuner.exportHex(shade)
      return `  --color-${shade.name}: ${hex};${shadeNote(tuner, shade.id)}`
    })
  ])

  return ['@theme {', ...(lines.length > 0 ? lines : ['  /* nothing changed */']), '}'].join('\n')
}

function shadeNote(tuner: ColorTuner, id: string): string {
  if (!SHIPPED_HEX.has(id)) return ' /* added */'

  const shade = tuner.shadeOf(id)
  return shade && tuner.isShadeShipped(shade) ? '' : ' /* changed */'
}

function stationBlock(tuner: ColorTuner, mode: Mode, station: StationName): string {
  const lines = ROLE_NAMES.map((role) => {
    const shade = tuner.shadeOf(tuner.roleId(mode, station, role))
    const value = shade ? `var(--color-${shade.name})` : '/* unanswered */'
    const changed = tuner.roleStatus(mode, station, role) !== 'shipped' ? ' /* changed */' : ''

    return `  --color-${role}: ${value};${changed}`
  })

  return [`${SELECTORS[mode][station]} {`, ...lines, '}'].join('\n')
}

/** Every palette entry whose bound shade no longer answers to the name the registry spells it with. */
function paletteBlock(tuner: ColorTuner): string {
  const renamed = renamedNames(tuner)
  const rows = Object.keys(PALETTE_BINDINGS)
    .filter((palette) => paletteMovedNames(palette, renamed).length > 0)
    .flatMap((palette) => paletteEntry(palette, renamed))

  return section('Palette bindings to update', rows)
}

function paletteMovedNames(palette: string, renamed: Map<string, string | null>): string[] {
  return MODES.flatMap((mode) =>
    PALETTE_ROLES.map((role) => PALETTE_BINDINGS[palette]?.[mode][role] ?? '')
  ).filter((name) => renamed.has(name))
}

function paletteEntry(palette: string, renamed: Map<string, string | null>): string[] {
  return [
    `  ${palette}: {`,
    ...MODES.flatMap((mode) => [
      `    ${mode}: {`,
      ...PALETTE_ROLES.map((role) => {
        const name = PALETTE_BINDINGS[palette]?.[mode][role] ?? ''
        const moved = renamed.get(name)

        return moved === null
          ? `      ${role}: '${name}', /* deleted — pick another shade */`
          : `      ${role}: '${moved ?? name}',${moved ? ' /* renamed */' : ''}`
      }),
      '    },'
    ]),
    '  },'
  ]
}

/** Shipped name -> the name it answers to now, or null where the shade was deleted outright. */
function renamedNames(tuner: ColorTuner): Map<string, string | null> {
  const moved = new Map<string, string | null>()

  for (const [id, name] of SHIPPED_NAME.entries()) {
    const shade = tuner.shadeOf(id)
    if (!shade) moved.set(name, null)
    else if (shade.name !== name) moved.set(name, shade.name)
  }

  return moved
}

function changedShadeList(tuner: ColorTuner, families: string[]): string {
  const rows = tuner.shades.value
    .filter((shade) => families.includes(shade.family))
    .filter((shade) => SHIPPED_HEX.has(shade.id) && !tuner.isShadeShipped(shade))
    .map(
      (shade) =>
        `  ${SHIPPED_NAME.get(shade.id)} ${SHIPPED_HEX.get(shade.id)}  ->  ${shade.name} ${tuner.exportHex(shade)}`
    )

  return section('Shades recoloured or renamed', rows)
}

function addedShadeList(tuner: ColorTuner, families: string[]): string {
  const rows = tuner.shades.value
    .filter((shade) => families.includes(shade.family))
    .filter((shade) => !SHIPPED_HEX.has(shade.id))
    .map((shade) => `  ${shade.name} ${tuner.exportHex(shade)} (${shade.family})`)

  return section('Shades added', rows)
}

function removedShadeList(tuner: ColorTuner, families: string[]): string {
  return section('Shades removed', removedNames(tuner, families))
}

function removedNames(tuner: ColorTuner, families: string[]): string[] {
  const live = new Set(tuner.shades.value.map((shade) => shade.id))

  return [...SHIPPED_NAME.entries()]
    .filter(([id]) => !live.has(id))
    .filter(([id]) => families.includes(SHIPPED_FAMILY.get(id) ?? ''))
    .map(([id, name]) => `  ${name} ${SHIPPED_HEX.get(id)}`)
}

function steps(heading: string, lines: string[]): string {
  return [`/* ${heading}`, ...lines.map((line) => ` * ${line}`), ' */'].join('\n')
}

function section(heading: string, rows: string[]): string {
  return [`/* ${heading} */`, ...(rows.length > 0 ? rows : ['  (none)'])].join('\n')
}
