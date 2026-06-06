import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { canUseCardImages, mockWarn, mockModalOpen } = vi.hoisted(() => ({
  canUseCardImages: { value: true },
  mockWarn: vi.fn(),
  mockModalOpen: vi.fn()
}))

vi.mock('@/composables/use-can', () => ({
  useCan: () => ({ useCardImages: canUseCardImages })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockWarn })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: mockModalOpen })
}))

vi.mock('@/components/modals/checkout.vue', () => ({
  default: { name: 'Checkout' }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

import { useCardImageGate } from '@/composables/card-editor/use-card-image-gate'

function makeAlertResponse(promise = Promise.resolve(undefined)) {
  return { response: promise }
}

describe('useCardImageGate', () => {
  beforeEach(() => {
    canUseCardImages.value = true
    mockWarn.mockReset()
    mockWarn.mockReturnValue(makeAlertResponse())
    mockModalOpen.mockClear()
  })

  test('returns true for a paid member without prompting', async () => {
    canUseCardImages.value = true
    const { guardCardImage } = useCardImageGate()

    const result = await guardCardImage()

    expect(result).toBe(true)
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockModalOpen).not.toHaveBeenCalled()
  })

  test('shows the upgrade alert when the member is on the free plan', async () => {
    canUseCardImages.value = false
    const { guardCardImage } = useCardImageGate()

    const result = await guardCardImage()

    expect(result).toBe(false)
    expect(mockWarn).toHaveBeenCalledWith({
      title: 'errors.card-images-paid.title',
      message: 'errors.card-images-paid.message',
      confirmLabel: 'errors.card-images-paid.upgrade-cta'
    })
  })

  test('opens the checkout modal when the free member confirms upgrade', async () => {
    canUseCardImages.value = false
    mockWarn.mockReturnValue(makeAlertResponse(Promise.resolve(true)))

    const { guardCardImage } = useCardImageGate()
    const result = await guardCardImage()

    expect(result).toBe(false)
    expect(mockModalOpen).toHaveBeenCalledWith(expect.objectContaining({ name: 'Checkout' }), {
      mode: 'mobile-sheet',
      backdrop: true
    })
  })

  test('does not open checkout when the free member cancels the alert', async () => {
    canUseCardImages.value = false
    mockWarn.mockReturnValue(makeAlertResponse(Promise.resolve(false)))

    const { guardCardImage } = useCardImageGate()
    const result = await guardCardImage()

    expect(result).toBe(false)
    expect(mockModalOpen).not.toHaveBeenCalled()
  })
})
