// The shape the tuner keeps, plus the two edges it has to survive: a reload, and a save written
// against a set of roles or shades that has since changed.

import {
  MODES,
  PREVIEW_ELEMENTS,
  ROLE_NAMES,
  SHIPPED_ROLES,
  SHIPPED_SHADES,
  STATIONS,
  type Hsl,
  type Mode,
  type RoleName,
  type StationName
} from './catalog'
import { hexToHsl } from './color-math'

export type Shade = {
  /** Stable identity a role binding holds; a rename never touches it. */
  id: string
  name: string
  family: string
  hsl: Hsl
}

export type ElementBinding = { bg: RoleName | null; text: RoleName | null }

export type TunerState = {
  shades: Shade[]
  /** A null role is one nobody has answered for that station and mode yet. */
  roles: Record<Mode, Record<StationName, Record<RoleName, string | null>>>
  /** A null backdrop follows the mode's own page surface instead of naming a shade. */
  backdrops: Record<Mode, string | null>
  elements: Record<string, ElementBinding>
}

export const STORAGE_KEY = 'taroflash:color-tuner'
export const STORAGE_VERSION = 1

/** The colour every shipped shade carries in the stylesheet, so an untouched shade exports unchanged. */
export const SHIPPED_HEX = new Map(SHIPPED_SHADES.map((shade) => [shade.id, shade.hex]))

export const SHIPPED_HSL = new Map(SHIPPED_SHADES.map((shade) => [shade.id, hexToHsl(shade.hex)]))

export const SHIPPED_NAME = new Map(SHIPPED_SHADES.map((shade) => [shade.id, shade.name]))

export function defaultState(): TunerState {
  return {
    shades: SHIPPED_SHADES.map((shade) => ({
      id: shade.id,
      name: shade.name,
      family: shade.family,
      hsl: hexToHsl(shade.hex)
    })),
    roles: structuredCopy(SHIPPED_ROLES),
    backdrops: { light: null, dark: null },
    elements: Object.fromEntries(
      PREVIEW_ELEMENTS.map((element) => [element.id, { bg: element.bg, text: element.text }])
    )
  }
}

/** What ships today, held apart from the live state so a row can say whether its value moved. */
export const SHIPPED_STATE = defaultState()

export function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function saveState(state: TunerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state }))
}

/**
 * Reads a saved session back onto fresh defaults one value at a time, dropping anything that no
 * longer names a real role, station or shade — a save written before a role existed still loads.
 */
export function loadState(): TunerState {
  const defaults = defaultState()
  const saved = readSaved()
  if (!saved) return defaults

  restoreShades(defaults, saved.shades)
  restoreRoles(defaults, saved.roles)
  restoreBackdrops(defaults, saved.backdrops)
  restoreElements(defaults, saved.elements)

  return defaults
}

function readSaved(): Record<string, unknown> | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null

  try {
    const parsed = JSON.parse(raw) as { version?: number; state?: Record<string, unknown> }
    if (parsed?.version !== STORAGE_VERSION) return null
    return parsed.state ?? null
  } catch {
    return null
  }
}

function restoreShades(target: TunerState, saved: unknown) {
  if (!Array.isArray(saved)) return

  const restored = saved.filter(isShade).map((shade) => ({
    id: shade.id,
    name: shade.name,
    family: shade.family,
    hsl: { h: shade.hsl.h, s: shade.hsl.s, l: shade.hsl.l }
  }))
  if (restored.length === 0) return

  // A shipped shade the save never mentions is one this build added since; keep it rather than
  // letting the save's shade list stand in for the whole set.
  const missing = target.shades.filter((shade) => !restored.some((kept) => kept.id === shade.id))

  target.shades = [...restored, ...missing]
}

function restoreRoles(target: TunerState, saved: unknown) {
  const by_mode = asRecord(saved)
  if (!by_mode) return

  for (const mode of MODES) {
    restoreModeRoles(target, mode, asRecord(by_mode[mode]))
  }
}

function restoreModeRoles(target: TunerState, mode: Mode, saved: Record<string, unknown> | null) {
  if (!saved) return

  const known = new Set(target.shades.map((shade) => shade.id))

  for (const station of STATIONS) {
    restoreStationRoles(target.roles[mode][station], asRecord(saved[station]), known)
  }
}

function restoreStationRoles(
  target: Record<RoleName, string | null>,
  saved: Record<string, unknown> | null,
  known: Set<string>
) {
  if (!saved) return

  for (const role of ROLE_NAMES) {
    const value = saved[role]
    if (value === null) target[role] = null
    if (typeof value === 'string' && known.has(value)) target[role] = value
  }
}

function restoreBackdrops(target: TunerState, saved: unknown) {
  const by_mode = asRecord(saved)
  if (!by_mode) return

  const known = new Set(target.shades.map((shade) => shade.id))

  for (const mode of MODES) {
    const value = by_mode[mode]
    if (typeof value === 'string' && known.has(value)) target.backdrops[mode] = value
  }
}

function restoreElements(target: TunerState, saved: unknown) {
  const by_element = asRecord(saved)
  if (!by_element) return

  for (const element of PREVIEW_ELEMENTS) {
    const binding = asRecord(by_element[element.id])
    if (!binding) continue

    target.elements[element.id] = {
      bg: asRole(binding.bg),
      text: asRole(binding.text) ?? element.text
    }
  }
}

function asRole(value: unknown): RoleName | null {
  return typeof value === 'string' && (ROLE_NAMES as string[]).includes(value)
    ? (value as RoleName)
    : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isShade(value: unknown): value is Shade {
  const shade = asRecord(value)
  if (!shade) return false

  const hsl = asRecord(shade.hsl)

  return (
    typeof shade.id === 'string' &&
    typeof shade.name === 'string' &&
    typeof shade.family === 'string' &&
    !!hsl &&
    typeof hsl.h === 'number' &&
    typeof hsl.s === 'number' &&
    typeof hsl.l === 'number'
  )
}
