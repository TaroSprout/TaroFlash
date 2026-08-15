import { vi } from 'vite-plus/test'
import { ROLE_NAMES } from '@/views/admin/color-page/catalog'

// A hand-built double for `ColorTuner`, shaped to satisfy every read a paint-target, mode-column,
// role-panel, shade-list or station-preview reaches for. Actions are `vi.fn()` spies — component
// tests assert wiring against them, the real state transitions are covered by
// `tests/unit/views/admin/color-page/use-color-tuner.test.js`.

export function makeShade(overrides = {}) {
  return {
    id: 'brown-100',
    name: 'brown-100',
    family: 'brown',
    hsl: { h: 40, s: 30, l: 92 },
    ...overrides
  }
}

export function makeTuner(overrides = {}) {
  const brown_100 = makeShade()
  const brown_200 = makeShade({ id: 'brown-200', name: 'brown-200', hsl: { h: 38, s: 25, l: 88 } })
  const shades = [brown_100, brown_200]

  const base = {
    state: { value: { backdrops: { light: null, dark: null } } },
    shades: { value: shades },
    ordered_shades: { value: shades },
    export_shades: { value: shades },
    families: { value: new Map([['brown', shades]]) },
    family_names: { value: ['brown'] },
    undo_label: { value: null },
    redo_label: { value: null },
    addShade: vi.fn(() => makeShade({ id: 'brown-new', name: 'brown-new-1' })),
    backdropShade: vi.fn(() => brown_100),
    beginRun: vi.fn(),
    canResetShade: vi.fn(() => false),
    deleteShade: vi.fn(),
    elementBinding: vi.fn(() => ({ bg: 'surface', text: 'ink' })),
    endRun: vi.fn(),
    exportHex: vi.fn(() => '#f3f1ea'),
    groundShade: vi.fn(() => brown_200),
    hexOf: vi.fn((shade) => (shade ? '#f3f1ea' : null)),
    isElementChanged: vi.fn(() => false),
    isShadeShipped: vi.fn(() => true),
    paintShade: vi.fn(() => brown_100),
    readRole: vi.fn((mode, station, role) => ({
      role,
      shade: brown_100,
      ground: brown_200,
      status: 'shipped',
      ratio: 6.5,
      floor: 4.5,
      flagged: false,
      steps: 2,
      can_step_up: true,
      can_step_down: true
    })),
    recolorShade: vi.fn(),
    redo: vi.fn(),
    renameShade: vi.fn(() => true),
    resetAll: vi.fn(),
    resetShade: vi.fn(),
    roleId: vi.fn(() => 'brown-100'),
    roleStatus: vi.fn(() => 'shipped'),
    setBackdrop: vi.fn(),
    setElementBg: vi.fn(),
    setElementText: vi.fn(),
    setRole: vi.fn(),
    shadeOf: vi.fn((id) => shades.find((shade) => shade.id === id) ?? null),
    shippedHexOf: vi.fn(() => '#f3f1ea'),
    stepRole: vi.fn(),
    unansweredCount: vi.fn(() => 0),
    undo: vi.fn(),
    usageCount: vi.fn(() => 0)
  }

  return { ...base, ...overrides }
}

export { ROLE_NAMES }
