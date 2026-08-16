import { computed, inject, ref, watch, type InjectionKey, type Ref } from 'vue'
import {
  ACCENT_FAMILIES,
  MODES,
  NEUTRAL_FAMILIES,
  ROLES,
  ROLE_NAMES,
  STATIONS,
  isAccentFamily,
  type Hsl,
  type Mode,
  type RoleName,
  type StationName
} from './catalog'
import {
  apcaLc,
  contrastRatio,
  hexToHsl,
  hslToHex,
  lightnessDelta,
  normalizeHsl,
  oklchOf,
  sameHsl
} from './color-math'
import {
  defaultState,
  loadState,
  saveState,
  structuredCopy,
  SHIPPED_HEX,
  SHIPPED_HSL,
  SHIPPED_NAME,
  SHIPPED_STATE,
  type Shade,
  type TunerState
} from './state'
import uid from '@/utils/uid'

/** Names the change an undo would reverse, as a locale key the toolbar renders. */
export type ChangeLabel = { key: string; params?: Record<string, string | number> }

export type RoleStatus = 'shipped' | 'unanswered' | 'changed'

export type Binding = { mode: Mode; station: StationName; role: RoleName }

export type RoleReading = {
  role: RoleName
  shade: Shade | null
  ground: Shade | null
  status: RoleStatus
  /** WCAG 2.2 ratio — the citable number. */
  ratio: number | null
  /** APCA Lc — the reading that still means something in dark mode. */
  lc: number | null
  /** OKLCH lightness between the role and its ground, replacing any count of positions apart. */
  delta_l: number | null
  floor: number | null
  flagged: boolean
  lighter: Shade | null
  darker: Shade | null
}

export type ColorTuner = ReturnType<typeof useColorTuner>

/** How long a stream of channel edits stays one undo step after the last one lands. */
const RUN_QUIET_MS = 500

/** Lightness a minted shade lands beyond the end of its family, in HSL points. */
const MINT_STEP = 6

/** Every slot a role can be answered in; a usage count that skipped one would let a live binding's shade be deleted. */
const BINDING_SLOTS: Binding[] = MODES.flatMap((mode) =>
  STATIONS.flatMap((station) => ROLE_NAMES.map((role) => ({ mode, station, role })))
)

export const colorTunerKey: InjectionKey<ColorTuner> = Symbol('color-tuner')

/** Reaches the one tuner the admin window created; both tuner pages share it. */
export function injectColorTuner(): ColorTuner {
  const tuner = inject(colorTunerKey)
  if (!tuner) throw new Error('Colour tuner used outside the admin window')

  return tuner
}

export function useColorTuner() {
  const state = ref<TunerState>(loadState()) as Ref<TunerState>

  const past = ref<{ label: ChangeLabel; state: TunerState }[]>([])
  const future = ref<{ label: ChangeLabel; state: TunerState }[]>([])

  // A stream of increments from one drag or one held key is a single change to undo, so the
  // snapshot is taken when the run opens and banked once the stream goes quiet.
  const run = ref<{ label: ChangeLabel; state: TunerState } | null>(null)

  // Re-sorting a family under a focused control would move the DOM node and drop focus mid-drag,
  // which stops a held arrow key dead. While a run is open the previous order stands.
  const frozen_order = ref<string[] | null>(null)

  let quiet_timer: ReturnType<typeof setTimeout> | null = null

  const shades = computed(() => state.value.shades)

  const shade_by_id = computed(() => new Map(shades.value.map((shade) => [shade.id, shade])))

  const ordered_shades = computed(() => {
    const sorted = [...shades.value].sort((a, b) => oklchOf(b.hsl).l - oklchOf(a.hsl).l)
    if (!frozen_order.value) return sorted

    const rank = new Map(frozen_order.value.map((id, index) => [id, index]))
    return sorted.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
  })

  // Neutrals before identities, each in the order the stylesheet declares them, so a family never
  // changes place when a shade is recoloured into a different alphabetical neighbourhood.
  const family_names = computed(() => {
    const live = new Set(shades.value.map((shade) => shade.family))
    const known = [...NEUTRAL_FAMILIES, ...ACCENT_FAMILIES].filter((family) => live.has(family))
    const rest = [...live].filter((family) => !known.includes(family)).sort()

    return [...known, ...rest]
  })

  /** The shades a station role may bind: identity families paint `data-palette`, never a station. */
  const neutral_shades = computed(() =>
    ordered_shades.value.filter((shade) => !isAccentFamily(shade.family))
  )

  /** Each family lightest first, which is the order the stylesheet numbers them in. */
  const families = computed(() => {
    const grouped = new Map<string, Shade[]>()
    for (const shade of ordered_shades.value) {
      grouped.set(shade.family, [...(grouped.get(shade.family) ?? []), shade])
    }
    return grouped
  })

  /** Every station and mode each shade paints, which is the blast radius of recolouring it. */
  const bindings_by_shade = computed(() => {
    const found = new Map<string, Binding[]>()

    for (const slot of BINDING_SLOTS) {
      const id = state.value.roles[slot.mode][slot.station][slot.role]
      if (id) found.set(id, [...(found.get(id) ?? []), slot])
    }

    return found
  })

  const undo_label = computed<ChangeLabel | null>(() => past.value.at(-1)?.label ?? null)
  const redo_label = computed<ChangeLabel | null>(() => future.value.at(-1)?.label ?? null)

  function roleId(mode: Mode, station: StationName, role: RoleName): string | null {
    return state.value.roles[mode][station][role]
  }

  function shadeOf(id: string | null): Shade | null {
    return id ? (shade_by_id.value.get(id) ?? null) : null
  }

  // Rounding a shipped hex through whole-number HSL shifts it a shade, so an untouched colour keeps
  // its stylesheet spelling and a specimen shows what the product actually renders.
  function hexOf(shade: Shade | null): string | null {
    return shade ? exportHex(shade) : null
  }

  function groundShade(mode: Mode, station: StationName, role: RoleName): Shade | null {
    const spec = ROLES.find((entry) => entry.name === role)
    if (!spec) return null

    if (spec.ground !== 'page-surface') return shadeOf(roleId(mode, station, spec.ground))

    // The page has nothing behind it, so its own surface is judged against nothing rather than
    // against itself.
    return station === 'page' ? null : shadeOf(roleId(mode, 'page', 'surface'))
  }

  /** A role with no shade of its own still has to paint something, so it falls back to the surface. */
  function paintShade(mode: Mode, station: StationName, role: RoleName): Shade | null {
    return shadeOf(roleId(mode, station, role)) ?? shadeOf(roleId(mode, station, 'surface'))
  }

  function roleStatus(mode: Mode, station: StationName, role: RoleName): RoleStatus {
    const current = roleId(mode, station, role)
    if (current === null) return 'unanswered'

    const shipped = SHIPPED_STATE.roles[mode][station][role]
    const shade = shadeOf(current)
    const shade_changed = !!shade && !isShadeShipped(shade)

    return current === shipped && !shade_changed ? 'shipped' : 'changed'
  }

  function readRole(mode: Mode, station: StationName, role: RoleName): RoleReading {
    const spec = ROLES.find((entry) => entry.name === role)
    const shade = shadeOf(roleId(mode, station, role))
    const ground = groundShade(mode, station, role)
    const ratio = shade && ground ? contrastRatio(shade.hsl, ground.hsl) : null
    const floor = spec?.floor ?? null

    return {
      role,
      shade,
      ground,
      status: roleStatus(mode, station, role),
      ratio,
      lc: shade && ground ? apcaLc(shade.hsl, ground.hsl) : null,
      delta_l: shade && ground ? lightnessDelta(shade.hsl, ground.hsl) : null,
      floor,
      flagged: floor !== null && ratio !== null && ratio < floor,
      lighter: neighbourShade(shade, -1),
      darker: neighbourShade(shade, 1)
    }
  }

  /** The next shade along the shade's own family, lighter at -1 and darker at 1, or null at the end. */
  function neighbourShade(shade: Shade | null, direction: 1 | -1): Shade | null {
    if (!shade) return null

    const family = families.value.get(shade.family) ?? []
    const index = family.findIndex((entry) => entry.id === shade.id)

    return family[index + direction] ?? null
  }

  function commit(label: ChangeLabel, mutate: () => void) {
    const before = structuredCopy(state.value)

    mutate()

    if (run.value) return

    past.value = [...past.value, { label, state: before }]
    future.value = []
  }

  /** Opens a stream of edits that lands in history as one change once `endRun` closes it. */
  function beginRun(label: ChangeLabel) {
    if (run.value) return

    run.value = { label, state: structuredCopy(state.value) }
    frozen_order.value = ordered_shades.value.map((shade) => shade.id)
  }

  function endRun() {
    const open = run.value
    run.value = null
    frozen_order.value = null

    if (!open) return
    if (JSON.stringify(open.state) === JSON.stringify(state.value)) return

    past.value = [...past.value, open]
    future.value = []
  }

  /** Holds a run open while edits keep arriving, so a drag banks as one step when it stops. */
  function keepRunOpen(label: ChangeLabel) {
    beginRun(label)

    if (quiet_timer) clearTimeout(quiet_timer)
    quiet_timer = setTimeout(() => {
      quiet_timer = null
      endRun()
    }, RUN_QUIET_MS)
  }

  function undo() {
    endRun()

    const entry = past.value.at(-1)
    if (!entry) return

    future.value = [...future.value, { label: entry.label, state: structuredCopy(state.value) }]
    past.value = past.value.slice(0, -1)
    state.value = entry.state
  }

  function redo() {
    const entry = future.value.at(-1)
    if (!entry) return

    past.value = [...past.value, { label: entry.label, state: structuredCopy(state.value) }]
    future.value = future.value.slice(0, -1)
    state.value = entry.state
  }

  function setRole(mode: Mode, station: StationName, role: RoleName, shade_id: string | null) {
    commit({ key: 'admin.color-tuner.change.rebind', params: { role } }, () => {
      state.value.roles[mode][station][role] = shade_id
    })
  }

  /** Points a role at the neighbouring shade in its own family; it never rewrites a colour. */
  function nudgeRole(mode: Mode, station: StationName, role: RoleName, direction: 1 | -1) {
    const next = neighbourShade(shadeOf(roleId(mode, station, role)), direction)
    if (!next) return

    setRole(mode, station, role, next.id)
  }

  /**
   * The escape hatch at the end of a family: mints the shade one step beyond and points the role at
   * it, as one undo step, because a rebind with nowhere to land is otherwise a dead end.
   */
  function mintBeyond(mode: Mode, station: StationName, role: RoleName, direction: 1 | -1) {
    const current = shadeOf(roleId(mode, station, role))
    if (!current || neighbourShade(current, direction)) return

    const minted = buildShade(current.family, {
      ...current.hsl,
      l: current.hsl.l + direction * -MINT_STEP
    })

    commit({ key: 'admin.color-tuner.change.mint-shade', params: { name: minted.name } }, () => {
      state.value.shades = [...state.value.shades, minted]
      state.value.roles[mode][station][role] = minted.id
    })
  }

  function setChannel(id: string, channel: keyof Hsl, value: number) {
    const shade = shadeOf(id)
    if (!shade) return

    keepRunOpen({ key: 'admin.color-tuner.change.recolor', params: { name: shade.name } })

    commit({ key: 'admin.color-tuner.change.recolor', params: { name: shade.name } }, () => {
      shade.hsl = normalizeHsl({ ...shade.hsl, [channel]: value })
    })
  }

  /**
   * Sets every channel at once from a hex spelling, which is what a colour picker hands back. It
   * rides the same run as a channel edit, so a drag around the picker's gamut banks as one undo step.
   */
  function setHex(id: string, hex: string) {
    const shade = shadeOf(id)
    if (!shade) return

    const label = { key: 'admin.color-tuner.change.recolor', params: { name: shade.name } }

    keepRunOpen(label)
    commit(label, () => {
      shade.hsl = normalizeHsl(hexToHsl(hex))
    })
  }

  function renameShade(id: string, name: string): boolean {
    const shade = shadeOf(id)
    const trimmed = name.trim()
    if (!shade || trimmed === '' || isNameTaken(trimmed, id)) return false

    // Committing a name that already reads the same banks an undo step that reverses nothing, and
    // the field re-commits on both Enter and the blur that follows it.
    if (shade.name === trimmed) return true

    commit({ key: 'admin.color-tuner.change.rename', params: { name: trimmed } }, () => {
      shade.name = trimmed
    })
    return true
  }

  function isNameTaken(name: string, except_id: string): boolean {
    return shades.value.some((shade) => shade.id !== except_id && shade.name === name)
  }

  /** Adds a shade to a family; it lands wherever its perceptual lightness puts it, like any other. */
  function addShade(family: string, hsl: Hsl): Shade {
    const shade = buildShade(family, hsl)

    commit({ key: 'admin.color-tuner.change.add-shade', params: { name: shade.name } }, () => {
      state.value.shades = [...state.value.shades, shade]
    })

    return shade
  }

  function buildShade(family: string, hsl: Hsl): Shade {
    return { id: `shade-${uid()}`, name: freeName(family), family, hsl: normalizeHsl(hsl) }
  }

  function freeName(family: string): string {
    let index = 1
    while (shades.value.some((shade) => shade.name === `${family}-new-${index}`)) index += 1
    return `${family}-new-${index}`
  }

  function bindingsOf(id: string): Binding[] {
    return bindings_by_shade.value.get(id) ?? []
  }

  function usageCount(id: string): number {
    return bindingsOf(id).length
  }

  function deleteShade(id: string) {
    const shade = shadeOf(id)
    if (!shade || usageCount(id) > 0) return

    commit({ key: 'admin.color-tuner.change.delete-shade', params: { name: shade.name } }, () => {
      state.value.shades = state.value.shades.filter((entry) => entry.id !== id)
    })
  }

  function isShadeShipped(shade: Shade): boolean {
    const hsl = SHIPPED_HSL.get(shade.id)
    return !!hsl && sameHsl(hsl, shade.hsl) && SHIPPED_NAME.get(shade.id) === shade.name
  }

  function canResetShade(shade: Shade): boolean {
    return SHIPPED_HSL.has(shade.id) && !isShadeShipped(shade)
  }

  function resetShade(id: string) {
    const shade = shadeOf(id)
    const hsl = shade && SHIPPED_HSL.get(id)
    const name = shade && SHIPPED_NAME.get(id)
    if (!shade || !hsl || !name) return

    commit({ key: 'admin.color-tuner.change.reset-shade', params: { name } }, () => {
      shade.hsl = { ...hsl }
      shade.name = name
    })
  }

  function shippedHexOf(shade: Shade): string | null {
    return SHIPPED_HEX.get(shade.id) ?? null
  }

  /** The hex a shade exports as — its shipped spelling while untouched, so a no-op reads as one. */
  function exportHex(shade: Shade): string {
    const shipped = SHIPPED_HSL.get(shade.id)
    const shipped_hex = SHIPPED_HEX.get(shade.id)

    return shipped && shipped_hex && sameHsl(shipped, shade.hsl) ? shipped_hex : hslToHex(shade.hsl)
  }

  function resetAll() {
    commit({ key: 'admin.color-tuner.change.reset-all' }, () => {
      state.value = defaultState()
    })
  }

  watch(state, (value) => saveState(value), { deep: true })

  return {
    state,
    shades,
    ordered_shades,
    families,
    family_names,
    undo_label,
    redo_label,
    addShade,
    beginRun,
    bindingsOf,
    canResetShade,
    deleteShade,
    endRun,
    exportHex,
    groundShade,
    hexOf,
    isNameTaken,
    isShadeShipped,
    mintBeyond,
    neighbourShade,
    neutral_shades,
    nudgeRole,
    paintShade,
    readRole,
    redo,
    renameShade,
    resetAll,
    resetShade,
    roleId,
    roleStatus,
    setChannel,
    setHex,
    setRole,
    shadeOf,
    shippedHexOf,
    undo,
    usageCount
  }
}
