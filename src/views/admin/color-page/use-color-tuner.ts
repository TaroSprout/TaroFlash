import { computed, ref, watch, type InjectionKey, type Ref } from 'vue'
import {
  MODES,
  ROLES,
  ROLE_NAMES,
  STATIONS,
  type Hsl,
  type Mode,
  type RoleName,
  type StationName
} from './catalog'
import { contrastRatio, hslToHex, normalizeHsl, sameHsl } from './color-math'
import {
  defaultState,
  loadState,
  saveState,
  structuredCopy,
  SHIPPED_HEX,
  SHIPPED_HSL,
  SHIPPED_NAME,
  SHIPPED_STATE,
  type ElementBinding,
  type Shade,
  type TunerState
} from './state'
import uid from '@/utils/uid'

/** Names the change an undo would reverse, as a locale key the panel renders. */
export type ChangeLabel = { key: string; params?: Record<string, string | number> }

export type RoleStatus = 'shipped' | 'unanswered' | 'changed'

export type RoleReading = {
  role: RoleName
  shade: Shade | null
  ground: Shade | null
  status: RoleStatus
  ratio: number | null
  floor: number | null
  flagged: boolean
  steps: number | null
  can_step_up: boolean
  can_step_down: boolean
}

export type ColorTuner = ReturnType<typeof useColorTuner>

export const colorTunerKey: InjectionKey<ColorTuner> = Symbol('color-tuner')

export function useColorTuner() {
  const state = ref<TunerState>(loadState()) as Ref<TunerState>

  const past = ref<{ label: ChangeLabel; state: TunerState }[]>([])
  const future = ref<{ label: ChangeLabel; state: TunerState }[]>([])

  // A run of increments from one held key is one change to undo, so the snapshot is taken when the
  // run opens and banked when it closes.
  const run = ref<{ label: ChangeLabel; state: TunerState } | null>(null)

  // Re-sorting a family under a focused control would move the DOM node and drop focus mid-drag,
  // which stops a held arrow key dead. While a run is open the previous order stands.
  const frozen_order = ref<string[] | null>(null)

  const shades = computed(() => state.value.shades)

  const shade_by_id = computed(() => new Map(shades.value.map((shade) => [shade.id, shade])))

  const ordered_shades = computed(() => {
    const sorted = [...shades.value].sort((a, b) => b.hsl.l - a.hsl.l)
    if (!frozen_order.value) return sorted

    const rank = new Map(frozen_order.value.map((id, index) => [id, index]))
    return sorted.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
  })

  const families = computed(() => {
    const grouped = new Map<string, Shade[]>()
    for (const shade of ordered_shades.value) {
      grouped.set(shade.family, [...(grouped.get(shade.family) ?? []), shade])
    }
    return grouped
  })

  const family_names = computed(() =>
    [...new Set(shades.value.map((shade) => shade.family))].sort()
  )

  /** How many role and backdrop bindings point at each shade, counting every station and mode. */
  const usage = computed(() => {
    const counts = new Map<string, number>()
    const bump = (id: string | null) => id && counts.set(id, (counts.get(id) ?? 0) + 1)

    for (const mode of MODES) {
      for (const station of STATIONS)
        ROLE_NAMES.forEach((role) => bump(roleId(mode, station, role)))
      bump(state.value.backdrops[mode])
    }

    return counts
  })

  const undo_label = computed<ChangeLabel | null>(() => past.value.at(-1)?.label ?? null)
  const redo_label = computed<ChangeLabel | null>(() => future.value.at(-1)?.label ?? null)

  const export_shades = computed(() => ordered_shades.value)

  function roleId(mode: Mode, station: StationName, role: RoleName): string | null {
    return state.value.roles[mode][station][role]
  }

  function shadeOf(id: string | null): Shade | null {
    return id ? (shade_by_id.value.get(id) ?? null) : null
  }

  function hexOf(shade: Shade | null): string | null {
    return shade ? hslToHex(shade.hsl) : null
  }

  /** The shade behind a mode's four previews — the one it was pointed at, else its own page surface. */
  function backdropShade(mode: Mode): Shade | null {
    const named = shadeOf(state.value.backdrops[mode])
    return named ?? shadeOf(roleId(mode, 'page', 'surface'))
  }

  function groundShade(mode: Mode, station: StationName, role: RoleName): Shade | null {
    const spec = ROLES.find((entry) => entry.name === role)
    if (!spec) return null

    return spec.ground === 'backdrop'
      ? backdropShade(mode)
      : shadeOf(roleId(mode, station, spec.ground))
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

  function unansweredCount(mode: Mode, station: StationName): number {
    return ROLE_NAMES.filter((role) => roleId(mode, station, role) === null).length
  }

  /**
   * How far apart two shades sit in the whole set ordered lightest to darkest — a step count that
   * still reads when the two come from different families.
   */
  function stepsBetween(a: Shade | null, b: Shade | null): number | null {
    if (!a || !b) return null

    const order = ordered_shades.value
    return Math.abs(order.findIndex((s) => s.id === a.id) - order.findIndex((s) => s.id === b.id))
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
      floor,
      flagged: floor !== null && ratio !== null && ratio < floor,
      steps: stepsBetween(shade, ground),
      can_step_up: !!neighbourShade(shade, 1),
      can_step_down: !!neighbourShade(shade, -1)
    }
  }

  /** The next shade along the role's own family — up is darker and higher-numbered — or null at the end. */
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

  /** Opens a run of increments that lands in history as one change once `endRun` closes it. */
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

  function undo() {
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
    commit({ key: 'admin.color-page.change.set-role', params: { role } }, () => {
      state.value.roles[mode][station][role] = shade_id
    })
  }

  function stepRole(mode: Mode, station: StationName, role: RoleName, direction: 1 | -1) {
    const next = neighbourShade(shadeOf(roleId(mode, station, role)), direction)
    if (!next) return

    setRole(mode, station, role, next.id)
  }

  function setBackdrop(mode: Mode, shade_id: string | null) {
    commit({ key: 'admin.color-page.change.set-backdrop', params: { mode } }, () => {
      state.value.backdrops[mode] = shade_id
    })
  }

  function recolorShade(id: string, hsl: Hsl) {
    const shade = shadeOf(id)
    if (!shade) return

    commit({ key: 'admin.color-page.change.recolor', params: { name: shade.name } }, () => {
      shade.hsl = normalizeHsl(hsl)
    })
  }

  function renameShade(id: string, name: string): boolean {
    const shade = shadeOf(id)
    const trimmed = name.trim()
    if (!shade || trimmed === '' || isNameTaken(trimmed, id)) return false

    commit({ key: 'admin.color-page.change.rename', params: { name: trimmed } }, () => {
      shade.name = trimmed
    })
    return true
  }

  function isNameTaken(name: string, except_id: string): boolean {
    return shades.value.some((shade) => shade.id !== except_id && shade.name === name)
  }

  /** Adds a shade to a family; it lands wherever its lightness puts it, like any other. */
  function addShade(family: string, hsl: Hsl): Shade {
    const shade: Shade = {
      id: `shade-${uid()}`,
      name: freeName(family),
      family,
      hsl: normalizeHsl(hsl)
    }

    commit({ key: 'admin.color-page.change.add-shade', params: { name: shade.name } }, () => {
      state.value.shades = [...state.value.shades, shade]
    })

    return shade
  }

  function freeName(family: string): string {
    let index = 1
    while (shades.value.some((shade) => shade.name === `${family}-new-${index}`)) index += 1
    return `${family}-new-${index}`
  }

  function usageCount(id: string): number {
    return usage.value.get(id) ?? 0
  }

  function deleteShade(id: string) {
    const shade = shadeOf(id)
    if (!shade || usageCount(id) > 0) return

    commit({ key: 'admin.color-page.change.delete-shade', params: { name: shade.name } }, () => {
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

    commit({ key: 'admin.color-page.change.reset-shade', params: { name } }, () => {
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

  function elementBinding(element_id: string): ElementBinding {
    return state.value.elements[element_id] ?? { bg: null, text: null }
  }

  function setElementBg(element_id: string, role: RoleName | null) {
    commit({ key: 'admin.color-page.change.set-fill', params: { element: element_id } }, () => {
      state.value.elements[element_id] = { ...elementBinding(element_id), bg: role }
    })
  }

  function setElementText(element_id: string, role: RoleName) {
    commit({ key: 'admin.color-page.change.set-text', params: { element: element_id } }, () => {
      state.value.elements[element_id] = { ...elementBinding(element_id), text: role }
    })
  }

  function isElementChanged(element_id: string): boolean {
    const shipped = SHIPPED_STATE.elements[element_id]
    const current = elementBinding(element_id)

    return !shipped || shipped.bg !== current.bg || shipped.text !== current.text
  }

  function resetAll() {
    commit({ key: 'admin.color-page.change.reset-all' }, () => {
      state.value = defaultState()
    })
  }

  watch(state, (value) => saveState(value), { deep: true })

  return {
    state,
    shades,
    ordered_shades,
    export_shades,
    families,
    family_names,
    undo_label,
    redo_label,
    addShade,
    backdropShade,
    beginRun,
    canResetShade,
    deleteShade,
    elementBinding,
    endRun,
    exportHex,
    groundShade,
    hexOf,
    isElementChanged,
    isShadeShipped,
    paintShade,
    readRole,
    recolorShade,
    redo,
    renameShade,
    resetAll,
    resetShade,
    roleId,
    roleStatus,
    setBackdrop,
    setElementBg,
    setElementText,
    setRole,
    shadeOf,
    shippedHexOf,
    stepRole,
    unansweredCount,
    undo,
    usageCount
  }
}
