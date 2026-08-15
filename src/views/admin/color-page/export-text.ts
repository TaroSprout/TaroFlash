// The text an admin pastes into the stylesheet by hand. This is the only way a tuned value ever
// reaches the product — the page writes no CSS of its own.

import { MODES, ROLE_NAMES, STATIONS, type Mode, type StationName } from './catalog'
import { SHIPPED_HEX, SHIPPED_NAME, SHIPPED_STATE } from './state'
import type { ColorTuner } from './use-color-tuner'

const SELECTORS: Record<Mode, Record<StationName, string>> = {
  light: {
    page: "[data-station='page']",
    panel: "[data-station='panel']",
    window: "[data-station='window']",
    float: "[data-station='float']"
  },
  dark: {
    page: ":root[data-mode='dark'], [data-mode='dark'] [data-station='page']",
    panel: "[data-mode='dark'] [data-station='panel']",
    window: "[data-mode='dark'] [data-station='window']",
    float: "[data-mode='dark'] [data-station='float']"
  }
}

export function buildExportText(tuner: ColorTuner): string {
  return [
    shadeBlock(tuner),
    ...MODES.flatMap((mode) => STATIONS.map((station) => stationBlock(tuner, mode, station))),
    changedShadeList(tuner),
    addedShadeList(tuner),
    removedShadeList(tuner),
    elementList(tuner)
  ].join('\n\n')
}

function shadeBlock(tuner: ColorTuner): string {
  const lines = tuner.family_names.value.flatMap((family) => [
    `  /* ${family} */`,
    ...(tuner.families.value.get(family) ?? []).map((shade) => {
      const hex = tuner.exportHex(shade)
      return `  --color-${shade.name}: ${hex};${shadeNote(tuner, shade.id)}`
    })
  ])

  return ['@theme {', ...lines, '}'].join('\n')
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

function changedShadeList(tuner: ColorTuner): string {
  const rows = tuner.shades.value
    .filter((shade) => SHIPPED_HEX.has(shade.id) && !tuner.isShadeShipped(shade))
    .map(
      (shade) =>
        `  ${SHIPPED_NAME.get(shade.id)} ${SHIPPED_HEX.get(shade.id)}  ->  ${shade.name} ${tuner.exportHex(shade)}`
    )

  return section('Shades recoloured or renamed', rows)
}

function addedShadeList(tuner: ColorTuner): string {
  const rows = tuner.shades.value
    .filter((shade) => !SHIPPED_HEX.has(shade.id))
    .map((shade) => `  ${shade.name} ${tuner.exportHex(shade)} (${shade.family})`)

  return section('Shades added', rows)
}

function removedShadeList(tuner: ColorTuner): string {
  const live = new Set(tuner.shades.value.map((shade) => shade.id))
  const rows = [...SHIPPED_NAME.entries()]
    .filter(([id]) => !live.has(id))
    .map(([id, name]) => `  ${name} ${SHIPPED_HEX.get(id)}`)

  return section('Shades removed', rows)
}

function elementList(tuner: ColorTuner): string {
  const rows = Object.keys(SHIPPED_STATE.elements)
    .filter((element_id) => tuner.isElementChanged(element_id))
    .flatMap((element_id) => {
      const shipped = SHIPPED_STATE.elements[element_id]
      const current = tuner.elementBinding(element_id)

      return [
        shipped.bg !== current.bg &&
          `  ${element_id} fill: ${label(shipped.bg)} -> ${label(current.bg)}`,
        shipped.text !== current.text &&
          `  ${element_id} text: ${label(shipped.text)} -> ${label(current.text)}`
      ].filter((row): row is string => typeof row === 'string')
    })

  return section('Preview bindings changed', rows)
}

function label(role: string | null): string {
  return role ?? 'none'
}

function section(heading: string, rows: string[]): string {
  return [`/* ${heading} */`, ...(rows.length > 0 ? rows : ['  (none)'])].join('\n')
}
