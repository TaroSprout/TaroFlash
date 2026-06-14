import { describe, test, expect } from 'vite-plus/test'
import { computed, ref, nextTick } from 'vue'
import { useCappedToggle } from '@/composables/ui/capped-toggle'

function makeModel(initial) {
  const inner = ref(initial)
  const model = computed({
    get: () => inner.value,
    set: (v) => (inner.value = v)
  })
  return { model, inner }
}

describe('useCappedToggle', () => {
  // ── Initialization ─────────────────────────────────────────────────────────

  test('seeds spin_value from the model when non-null', () => {
    const { model } = makeModel(75)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50)
    expect(spin_value.value).toBe(75)
    expect(is_all.value).toBe(false)
  })

  test('seeds spin_value from max when model is null and max is finite', () => {
    const { model } = makeModel(null)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50)
    expect(spin_value.value).toBe(200)
    expect(is_all.value).toBe(true)
  })

  test('seeds spin_value from max when model is undefined and max is finite', () => {
    const { model } = makeModel(undefined)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50)
    expect(spin_value.value).toBe(200)
    expect(is_all.value).toBe(false)
  })

  test('seeds spin_value from default_value when model is null and max is infinite', () => {
    const { model } = makeModel(null)
    const { spin_value, is_all } = useCappedToggle(model, Infinity, 50)
    expect(spin_value.value).toBe(50)
    expect(is_all.value).toBe(true)
  })

  test('seeds spin_value from prefill_when_all when provided and model is null', () => {
    const { model } = makeModel(null)
    const { spin_value } = useCappedToggle(model, 200, 50, () => 137)
    expect(spin_value.value).toBe(137)
  })

  // ── onSpin ─────────────────────────────────────────────────────────────────

  test('onSpin writes the value through to the model below max', () => {
    const { model, inner } = makeModel(50)
    const { onSpin, spin_value } = useCappedToggle(model, 200, 50)

    onSpin(120)

    expect(spin_value.value).toBe(120)
    expect(inner.value).toBe(120)
  })

  test('onSpin flips the model to null at max', () => {
    const { model, inner } = makeModel(195)
    const { onSpin, spin_value, is_all } = useCappedToggle(model, 200, 50)

    onSpin(200)

    expect(inner.value).toBeNull()
    expect(is_all.value).toBe(true)
    expect(spin_value.value).toBe(200)
  })

  test('onSpin past max also flips to null', () => {
    const { model, inner } = makeModel(50)
    const { onSpin } = useCappedToggle(model, 200, 50)

    onSpin(250)

    expect(inner.value).toBeNull()
  })

  // ── spin_value setter ──────────────────────────────────────────────────────

  test('spin_value writes route through onSpin', () => {
    const { model, inner } = makeModel(50)
    const { spin_value } = useCappedToggle(model, 200, 50)

    spin_value.value = 80

    expect(inner.value).toBe(80)
  })

  // ── is_all toggle ──────────────────────────────────────────────────────────

  test('toggling is_all on sets the model to null', () => {
    const { model, inner } = makeModel(50)
    const { is_all } = useCappedToggle(model, 200, 50)

    is_all.value = true

    expect(inner.value).toBeNull()
  })

  test('toggling is_all off restores the last numeric value', () => {
    const { model, inner } = makeModel(75)
    const { is_all } = useCappedToggle(model, 200, 50)

    is_all.value = true
    is_all.value = false

    expect(inner.value).toBe(75)
  })

  test('toggling is_all on calls the prefill callback and uses its value', () => {
    const { model } = makeModel(50)
    const prefill = () => 137
    const { is_all, spin_value } = useCappedToggle(model, 200, 50, prefill)

    is_all.value = true

    expect(spin_value.value).toBe(137)
  })

  test('toggling is_all on without prefill leaves spin_value unchanged', () => {
    const { model } = makeModel(50)
    const { is_all, spin_value } = useCappedToggle(model, 200, 50)

    is_all.value = true

    expect(spin_value.value).toBe(50)
  })

  test('toggling is_all on when prefill returns undefined leaves spin_value unchanged', () => {
    const { model } = makeModel(50)
    const { is_all, spin_value } = useCappedToggle(model, 200, 50, () => undefined)

    is_all.value = true

    expect(spin_value.value).toBe(50)
  })

  // ── External model changes ────────────────────────────────────────────────

  test('external numeric change syncs spin_value', async () => {
    const { model, inner } = makeModel(50)
    const { spin_value } = useCappedToggle(model, 200, 50)

    inner.value = 90
    await nextTick()

    expect(spin_value.value).toBe(90)
  })

  test('external null change flips is_all to true but keeps last spin_value', async () => {
    const { model, inner } = makeModel(75)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50)

    inner.value = null
    await nextTick()

    expect(is_all.value).toBe(true)
    expect(spin_value.value).toBe(75)
  })
})
