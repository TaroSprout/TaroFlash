import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { useNoticeStore } from '@/stores/notice-store'

describe('useNoticeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('sfx defaults', () => {
    test('error() auto-defaults sfx.open to digi_powerdown when caller omits it', () => {
      const store = useNoticeStore()
      store.error('broke')
      expect(store.notices[0].sfx).toEqual({ open: 'digi_powerdown' })
    })

    test('error() lets a caller-supplied sfx.open override the default', () => {
      const store = useNoticeStore()
      store.error('broke', { sfx: { open: 'success_3' } })
      expect(store.notices[0].sfx).toEqual({ open: 'success_3' })
    })

    test('success() does not auto-inject any sfx', () => {
      const store = useNoticeStore()
      store.success('yay')
      expect(store.notices[0].sfx).toBeUndefined()
    })

    test('warn() does not auto-inject any sfx', () => {
      const store = useNoticeStore()
      store.warn('careful')
      expect(store.notices[0].sfx).toBeUndefined()
    })

    test('info() does not auto-inject any sfx', () => {
      const store = useNoticeStore()
      store.info('fyi')
      expect(store.notices[0].sfx).toBeUndefined()
    })

    test('success() keeps caller-supplied sfx untouched', () => {
      const store = useNoticeStore()
      store.success('yay', { sfx: { open: 'success_3' } })
      expect(store.notices[0].sfx).toEqual({ open: 'success_3' })
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
