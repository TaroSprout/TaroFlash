import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { useNoticeStore } from '@/stores/notice-store'

describe('useNoticeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('sfx defaults', () => {
    test('error() auto-defaults sfx.open to notice.error when caller omits it', () => {
      const store = useNoticeStore()
      store.error('broke')
      expect(store.notices[0].sfx).toEqual({ open: 'notice.error' })
    })

    test('error() lets a caller-supplied sfx.open override the default', () => {
      const store = useNoticeStore()
      store.error('broke', { sfx: { open: 'notice.success' } })
      expect(store.notices[0].sfx).toEqual({ open: 'notice.success' })
    })

    test('success() auto-defaults sfx.open to notice.success when caller omits it', () => {
      const store = useNoticeStore()
      store.success('yay')
      expect(store.notices[0].sfx).toEqual({ open: 'notice.success' })
    })

    test('success() lets a caller-supplied sfx.open override the default', () => {
      const store = useNoticeStore()
      store.success('yay', { sfx: { open: 'notice.info' } })
      expect(store.notices[0].sfx).toEqual({ open: 'notice.info' })
    })

    test('warn() auto-defaults sfx.open to notice.error when caller omits it', () => {
      const store = useNoticeStore()
      store.warn('careful')
      expect(store.notices[0].sfx).toEqual({ open: 'notice.error' })
    })

    test('warn() lets a caller-supplied sfx.open override the default', () => {
      const store = useNoticeStore()
      store.warn('careful', { sfx: { open: 'notice.success' } })
      expect(store.notices[0].sfx).toEqual({ open: 'notice.success' })
    })

    test('info() auto-defaults sfx.open to notice.info when caller omits it', () => {
      const store = useNoticeStore()
      store.info('fyi')
      expect(store.notices[0].sfx).toEqual({ open: 'notice.info' })
    })

    test('info() lets a caller-supplied sfx.open override the default', () => {
      const store = useNoticeStore()
      store.info('fyi', { sfx: { open: 'notice.success' } })
      expect(store.notices[0].sfx).toEqual({ open: 'notice.success' })
    })
  })

  describe('addNotice defaults', () => {
    test('persist auto-defaults to true when actions are supplied and persist is omitted', () => {
      const store = useNoticeStore()
      store.info('msg', { actions: [{ label: 'Undo', onClick: () => {} }] })
      expect(store.notices[0].persist).toBe(true)
    })

    test('persist stays false when explicitly set, even alongside actions', () => {
      const store = useNoticeStore()
      store.info('msg', {
        actions: [{ label: 'Undo', onClick: () => {} }],
        persist: false
      })
      expect(store.notices[0].persist).toBe(false)
    })

    test('persist defaults to false when there are no actions and no explicit persist', () => {
      const store = useNoticeStore()
      store.info('msg')
      expect(store.notices[0].persist).toBe(false)
    })

    test('backdrop defaults to true when omitted', () => {
      const store = useNoticeStore()
      store.info('msg')
      expect(store.notices[0].backdrop).toBe(true)
    })

    test('closable defaults to true when omitted', () => {
      const store = useNoticeStore()
      store.info('msg')
      expect(store.notices[0].closable).toBe(true)
    })

    test('backdrop and closable respect explicit false overrides', () => {
      const store = useNoticeStore()
      store.info('msg', { backdrop: false, closable: false })
      expect(store.notices[0].backdrop).toBe(false)
      expect(store.notices[0].closable).toBe(false)
    })
  })

  describe('toast_notices / panel_notices', () => {
    test('a notice with no variant specified lands in toast_notices', () => {
      const store = useNoticeStore()
      store.info('msg')
      expect(store.toast_notices).toHaveLength(1)
      expect(store.panel_notices).toHaveLength(0)
    })

    test('only variant: panel notices land in panel_notices', () => {
      const store = useNoticeStore()
      store.info('toast msg')
      store.info('panel msg', { variant: 'panel' })
      expect(store.toast_notices).toHaveLength(1)
      expect(store.toast_notices[0].message).toBe('toast msg')
      expect(store.panel_notices).toHaveLength(1)
      expect(store.panel_notices[0].message).toBe('panel msg')
    })
  })

  describe('panel notices are capped to one at a time', () => {
    test('adding a new panel notice replaces the existing one', () => {
      const store = useNoticeStore()
      store.info('first panel', { variant: 'panel' })
      store.error('second panel', { variant: 'panel' })
      expect(store.panel_notices).toHaveLength(1)
      expect(store.panel_notices[0].message).toBe('second panel')
    })

    test('adding a panel notice does not touch existing toasts', () => {
      const store = useNoticeStore()
      store.info('toast msg')
      store.error('panel msg', { variant: 'panel' })
      expect(store.toast_notices).toHaveLength(1)
      expect(store.toast_notices[0].message).toBe('toast msg')
      expect(store.panel_notices).toHaveLength(1)
    })

    test('toasts still stack when multiple are added', () => {
      const store = useNoticeStore()
      store.info('toast one')
      store.info('toast two')
      expect(store.toast_notices).toHaveLength(2)
    })
  })

  // ── return value [obligation] ────────────────────────────────────────────

  describe('addNotice / warn / success / error / info return the created Notice [obligation]', () => {
    test('warn() returns the notice it just pushed [obligation]', () => {
      const store = useNoticeStore()
      const notice = store.warn('careful')
      expect(notice).toEqual(store.notices[0])
    })

    test('success() returns the notice it just pushed [obligation]', () => {
      const store = useNoticeStore()
      const notice = store.success('yay')
      expect(notice).toEqual(store.notices[0])
    })

    test('error() returns the notice it just pushed [obligation]', () => {
      const store = useNoticeStore()
      const notice = store.error('broke')
      expect(notice).toEqual(store.notices[0])
    })

    test('info() returns the notice it just pushed [obligation]', () => {
      const store = useNoticeStore()
      const notice = store.info('fyi')
      expect(notice).toEqual(store.notices[0])
    })

    test('a caller can dismiss the returned notice via removeNotice [obligation]', () => {
      const store = useNoticeStore()
      const notice = store.success('yay')

      store.removeNotice(notice)

      expect(store.notices).toHaveLength(0)
    })
  })

  describe('removeNotice', () => {
    test('removes the matching notice by id', () => {
      const store = useNoticeStore()
      store.info('first')
      store.info('second')
      const [first] = store.notices
      store.removeNotice(first)
      expect(store.notices).toHaveLength(1)
      expect(store.notices[0].message).toBe('second')
    })

    test('is a no-op when the notice is not found', () => {
      const store = useNoticeStore()
      store.info('first')
      store.removeNotice({ id: 'does-not-exist' })
      expect(store.notices).toHaveLength(1)
    })
  })
})
