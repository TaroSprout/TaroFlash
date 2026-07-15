import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import { useModal } from '@/composables/modal'
import { useModalRecede } from '@/components/ui-kit/modal/use-modal-recede'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn()
  }
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// modal_stack is module-level state — reset before each test.
beforeEach(() => {
  const { modal_stack, pop } = useModal()
  while (modal_stack.value.length > 0) pop()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useModalRecede', () => {
  describe('normal case (single push/pop)', () => {
    test('opening a second modal recedes the first, not the top [obligation]', async () => {
      const { open, modal_stack } = useModal()
      const { receded_ids } = useModalRecede()

      open({})
      await nextTick()
      const idA = modal_stack.value[0].id

      open({})
      await nextTick()
      const idB = modal_stack.value[1].id

      expect(receded_ids.has(idA)).toBe(true)
      expect(receded_ids.has(idB)).toBe(false)
    })

    test('closing the top modal restores the previously-receded one [obligation]', async () => {
      const { open, modal_stack } = useModal()
      const { receded_ids } = useModalRecede()

      open({})
      await nextTick()
      const idA = modal_stack.value[0].id

      const { close } = open({})
      await nextTick()
      expect(receded_ids.has(idA)).toBe(true)

      close()
      await nextTick()

      expect(receded_ids.has(idA)).toBe(false)
    })
  })

  describe('batch stack-size jumps [obligation]', () => {
    test('a jump from 1 to 3 entries in one tick still recedes everything except the top [obligation]', async () => {
      const { open, modal_stack } = useModal()
      const { receded_ids } = useModalRecede()

      open({})
      await nextTick()

      // Two more pushes land in the same reactive flush — the stack changes
      // by more than one entry at once, not one push at a time.
      open({})
      open({})
      await nextTick()

      const ids = modal_stack.value.map((m) => m.id)
      expect(ids).toHaveLength(3)
      expect(receded_ids.has(ids[0])).toBe(true)
      expect(receded_ids.has(ids[1])).toBe(true)
      expect(receded_ids.has(ids[2])).toBe(false)
    })

    test('a collapse from 3 to 1 entry in one tick still restores the sole remaining entry [obligation]', async () => {
      const { open, pop, modal_stack } = useModal()
      const { receded_ids } = useModalRecede()

      open({})
      await nextTick()
      open({})
      await nextTick()
      open({})
      await nextTick()

      const bottom_id = modal_stack.value[0].id
      expect(receded_ids.has(bottom_id)).toBe(true)

      // Two pops land in the same reactive flush — the stack collapses by
      // more than one entry at once, not one pop at a time.
      pop()
      pop()
      await nextTick()

      expect(modal_stack.value).toHaveLength(1)
      expect(receded_ids.has(bottom_id)).toBe(false)
    })
  })

  describe('setModalEl', () => {
    test('registering an element lets recedeModal/restoreModal run against it', async () => {
      const gsap_module = await import('gsap')
      const { open, modal_stack } = useModal()
      const { setModalEl } = useModalRecede()

      open({})
      await nextTick()
      const idA = modal_stack.value[0].id
      setModalEl(idA, document.createElement('div'))

      open({})
      await nextTick()

      expect(gsap_module.gsap.set).toHaveBeenCalled()
      expect(gsap_module.gsap.to).toHaveBeenCalled()
    })

    test('setModalEl(id, null) clears the id out of receded_ids (unmount cleanup) [obligation]', async () => {
      const { open, modal_stack } = useModal()
      const { receded_ids, setModalEl } = useModalRecede()

      open({})
      await nextTick()
      const idA = modal_stack.value[0].id

      open({})
      await nextTick()
      expect(receded_ids.has(idA)).toBe(true)

      setModalEl(idA, null)

      expect(receded_ids.has(idA)).toBe(false)
    })
  })
})
