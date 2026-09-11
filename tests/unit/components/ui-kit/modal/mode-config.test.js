import { describe, test, expect, vi } from 'vite-plus/test'

const {
  mockDialogEnterMotion,
  mockDialogLeaveMotion,
  mockSheetEnterMotion,
  mockSheetLeaveMotion,
  mockPopupEnterMotion,
  mockPopupLeaveMotion
} = vi.hoisted(() => ({
  mockDialogEnterMotion: vi.fn(),
  mockDialogLeaveMotion: vi.fn(),
  mockSheetEnterMotion: vi.fn(),
  mockSheetLeaveMotion: vi.fn(),
  mockPopupEnterMotion: vi.fn(),
  mockPopupLeaveMotion: vi.fn()
}))

vi.mock('@/utils/animations/modal', () => ({
  dialogEnterMotion: mockDialogEnterMotion,
  dialogLeaveMotion: mockDialogLeaveMotion,
  sheetEnterMotion: mockSheetEnterMotion,
  sheetLeaveMotion: mockSheetLeaveMotion,
  popupEnterMotion: mockPopupEnterMotion,
  popupLeaveMotion: mockPopupLeaveMotion
}))

import { MODAL_MODE_CONFIG } from '@/components/ui-kit/modal/mode-config'

describe('MODAL_MODE_CONFIG — dialog', () => {
  test('enter resolves to dialogEnterMotion regardless of is_mobile', () => {
    expect(MODAL_MODE_CONFIG.dialog.enter(true)).toBe(mockDialogEnterMotion)
    expect(MODAL_MODE_CONFIG.dialog.enter(false)).toBe(mockDialogEnterMotion)
  })

  test('leave resolves to dialogLeaveMotion regardless of is_mobile', () => {
    expect(MODAL_MODE_CONFIG.dialog.leave(true)).toBe(mockDialogLeaveMotion)
    expect(MODAL_MODE_CONFIG.dialog.leave(false)).toBe(mockDialogLeaveMotion)
  })

  test('containerClass centers items', () => {
    expect(MODAL_MODE_CONFIG.dialog.containerClass).toBe('items-center')
  })
})

describe('MODAL_MODE_CONFIG — mobile-sheet', () => {
  test('enter resolves to sheetEnterMotion when is_mobile is true', () => {
    expect(MODAL_MODE_CONFIG['mobile-sheet'].enter(true)).toBe(mockSheetEnterMotion)
  })

  test('enter resolves to dialogEnterMotion when is_mobile is false', () => {
    expect(MODAL_MODE_CONFIG['mobile-sheet'].enter(false)).toBe(mockDialogEnterMotion)
  })

  test('leave resolves to sheetLeaveMotion when is_mobile is true', () => {
    expect(MODAL_MODE_CONFIG['mobile-sheet'].leave(true)).toBe(mockSheetLeaveMotion)
  })

  test('leave resolves to dialogLeaveMotion when is_mobile is false', () => {
    expect(MODAL_MODE_CONFIG['mobile-sheet'].leave(false)).toBe(mockDialogLeaveMotion)
  })
})

describe('MODAL_MODE_CONFIG — popup', () => {
  test('enter resolves to popupEnterMotion regardless of is_mobile', () => {
    expect(MODAL_MODE_CONFIG.popup.enter(true)).toBe(mockPopupEnterMotion)
    expect(MODAL_MODE_CONFIG.popup.enter(false)).toBe(mockPopupEnterMotion)
  })

  test('leave resolves to popupLeaveMotion regardless of is_mobile', () => {
    expect(MODAL_MODE_CONFIG.popup.leave(true)).toBe(mockPopupLeaveMotion)
    expect(MODAL_MODE_CONFIG.popup.leave(false)).toBe(mockPopupLeaveMotion)
  })

  test('containerClass centers items', () => {
    expect(MODAL_MODE_CONFIG.popup.containerClass).toBe('items-center')
  })
})
