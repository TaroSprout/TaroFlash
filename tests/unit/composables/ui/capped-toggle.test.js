import { describe, test, expect } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { useCappedToggle } from '@/composables/ui/capped-toggle'

describe('useCappedToggle [obligation]', () => {
  test('model has a real number and is_all is false — spin_value shows that number [obligation]', () => {
    const model = ref(5)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50, () => 20)

    expect(is_all.value).toBe(false)
    expect(spin_value.value).toBe(5)
  })

  test('toggling is_all true via the pill sets model to null and spin_value shows on_all_prefill(), not a cached number [obligation]', () => {
    const model = ref(5)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50, () => 20)

    is_all.value = true

    expect(model.value).toBeNull()
    expect(spin_value.value).toBe(20)
  })

  test('toggling is_all on then off restores the original numeric value, not the prefill or a default [obligation]', () => {
    const model = ref(5)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50, () => 200)

    is_all.value = true
    expect(spin_value.value).toBe(200)

    is_all.value = false

    expect(model.value).toBe(5)
    expect(spin_value.value).toBe(5)
  })

  test('fresh mount already on all (model starts null) — toggling off falls back to on_all_prefill(), no prior numeric value to restore [obligation]', () => {
    const model = ref(null)
    const { spin_value, is_all } = useCappedToggle(model, 200, 50, () => 75)

    expect(is_all.value).toBe(true)

    is_all.value = false

    expect(model.value).toBe(75)
    expect(spin_value.value).toBe(75)
  })

  test('external reset: model set to null from outside the pill immediately reflects on_all_prefill() [obligation]', async () => {
    const model = ref(5)
    const { spin_value } = useCappedToggle(model, 200, 50, () => 33)

    model.value = null
    await nextTick()

    expect(spin_value.value).toBe(33)
  })

  test('external reset to a concrete non-null number immediately reflects that number [obligation]', async () => {
    const model = ref(null)
    const { spin_value } = useCappedToggle(model, 200, 50, () => 33)

    model.value = 42
    await nextTick()

    expect(spin_value.value).toBe(42)
  })

  test('onSpin flips to null once the value reaches max', () => {
    const model = ref(5)
    const { onSpin } = useCappedToggle(model, 10, 5, () => 100)

    onSpin(10)

    expect(model.value).toBeNull()
  })

  test('onSpin below max stages the numeric value on the model', () => {
    const model = ref(5)
    const { onSpin } = useCappedToggle(model, 10, 5, () => 100)

    onSpin(7)

    expect(model.value).toBe(7)
  })
})
