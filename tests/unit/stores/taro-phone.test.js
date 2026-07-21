import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useTaroPhoneStore } from '@/stores/taro-phone'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mimics OpenModalResult — a promise the caller controls from outside. */
function makeDeferredResult() {
  let resolve
  const response = new Promise((res) => {
    resolve = res
  })
  return { response, resolve }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
})

// ── open / close ──────────────────────────────────────────────────────────────

describe('useTaroPhoneStore — open / close', () => {
  test('open sets is_open to true', () => {
    const store = useTaroPhoneStore()
    store.open()
    expect(store.is_open).toBe(true)
  })

  test('close sets is_open to false', () => {
    const store = useTaroPhoneStore()
    store.open()
    store.close()
    expect(store.is_open).toBe(false)
  })
})

// ── openApp — hide/reopen contract [obligation] ────────────────────────────────

describe('useTaroPhoneStore — openApp hide/reopen contract', () => {
  test('hides the phone synchronously when called', () => {
    const store = useTaroPhoneStore()
    store.open()
    const deferred = makeDeferredResult()

    store.openApp(deferred)

    expect(store.is_open).toBe(false)
  })

  test('reopens the phone once result.response resolves', async () => {
    const store = useTaroPhoneStore()
    store.open()
    const deferred = makeDeferredResult()

    store.openApp(deferred)
    expect(store.is_open).toBe(false)

    deferred.resolve(undefined)
    await flushPromises()

    expect(store.is_open).toBe(true)
  })
})

// ── openApp — idempotency against double resolution [obligation] ──────────────

describe('useTaroPhoneStore — openApp idempotency', () => {
  test('a stale finally does not force is_open back to true once was_hidden_for_app_modal was already cleared', async () => {
    const store = useTaroPhoneStore()
    store.open()

    const first = makeDeferredResult()
    const second = makeDeferredResult()

    store.openApp(first)
    store.openApp(second)
    expect(store.is_open).toBe(false)

    // First app's modal closes — reopens the phone and clears the hide flag.
    first.resolve(undefined)
    await flushPromises()
    expect(store.is_open).toBe(true)

    // User manually closes the phone after the reopen.
    store.close()
    expect(store.is_open).toBe(false)

    // Second app's modal (stale) resolves afterwards — its .finally must see
    // was_hidden_for_app_modal already false and bail without forcing is_open.
    second.resolve(undefined)
    await flushPromises()

    expect(store.is_open).toBe(false)
  })
})

// ── reset — logout teardown [obligation] ──────────────────────────────────────

describe('useTaroPhoneStore — reset', () => {
  test('closes the phone so no stale open state leaks into the next session', () => {
    const store = useTaroPhoneStore()
    store.open()

    store.reset()

    expect(store.is_open).toBe(false)
  })

  test('clears notifications', () => {
    const store = useTaroPhoneStore()
    store.notify('settings', 3)
    store.notify('feedback', 2)

    store.reset()

    expect(store.notification_count).toBe(0)
  })

  test('clears the app-modal hide flag so a stale finally cannot reopen the phone', async () => {
    const store = useTaroPhoneStore()
    store.open()
    const deferred = makeDeferredResult()
    store.openApp(deferred)

    store.reset()
    deferred.resolve(undefined)
    await flushPromises()

    expect(store.is_open).toBe(false)
  })
})

// ── notify / clearNotification / notification_count ───────────────────────────

describe('useTaroPhoneStore — notifications', () => {
  test('notify sets a notification count for an app', () => {
    const store = useTaroPhoneStore()
    store.notify('settings', 3)
    expect(store.notifications.settings).toBe(3)
  })

  test('notify overwrites an existing notification', () => {
    const store = useTaroPhoneStore()
    store.notify('settings', 1)
    store.notify('settings', 5)
    expect(store.notifications.settings).toBe(5)
  })

  test('clearNotification removes the entry for that app', () => {
    const store = useTaroPhoneStore()
    store.notify('settings', 3)
    store.clearNotification('settings')
    expect(store.notifications.settings).toBeUndefined()
  })

  test('clearNotification leaves other apps untouched', () => {
    const store = useTaroPhoneStore()
    store.notify('settings', 3)
    store.notify('feedback', 2)
    store.clearNotification('settings')
    expect(store.notifications.feedback).toBe(2)
  })

  test('notification_count sums all notification values', () => {
    const store = useTaroPhoneStore()
    store.notify('settings', 3)
    store.notify('feedback', 2)
    expect(store.notification_count).toBe(5)
  })

  test('notification_count is 0 when there are no notifications', () => {
    const store = useTaroPhoneStore()
    expect(store.notification_count).toBe(0)
  })
})
