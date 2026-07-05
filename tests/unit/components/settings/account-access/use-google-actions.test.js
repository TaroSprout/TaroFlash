import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAlert } = vi.hoisted(() => ({ mockAlert: { warn: vi.fn() } }))
const { mockToast } = vi.hoisted(() => ({ mockToast: { error: vi.fn(), success: vi.fn() } }))
const { mockLinkGoogleIdentity, mockUnlinkGoogleIdentity, mockGetUser } = vi.hoisted(() => ({
  mockLinkGoogleIdentity: vi.fn(),
  mockUnlinkGoogleIdentity: vi.fn(),
  mockGetUser: vi.fn()
}))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/composables/toast', () => ({ useToast: () => mockToast }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
vi.mock('@/api/session', () => ({
  linkGoogleIdentity: mockLinkGoogleIdentity,
  unlinkGoogleIdentity: mockUnlinkGoogleIdentity,
  getUser: mockGetUser
}))

import { useSessionStore } from '@/stores/session'
import { useGoogleActions } from '@/components/settings/account-access/use-google-actions'

function confirmResponse(value) {
  mockAlert.warn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockAlert.warn.mockReset()
  mockToast.error.mockReset()
  mockToast.success.mockReset()
  mockLinkGoogleIdentity.mockReset()
  mockUnlinkGoogleIdentity.mockReset()
  mockGetUser.mockReset()
})

// ── reactivity obligation ───────────────────────────────────────────────────

describe('useGoogleActions — reactivity', () => {
  test('[obligation] hasGoogleIdentity/hasPasswordIdentity reflect store changes without re-invoking the composable', async () => {
    const session = useSessionStore()
    const google = useGoogleActions()

    expect(google.hasGoogleIdentity.value).toBe(false)
    expect(google.hasPasswordIdentity.value).toBe(false)

    session.user = {
      id: 'u1',
      aud: 'authenticated',
      identities: [{ provider: 'email' }, { provider: 'google' }]
    }

    expect(google.hasGoogleIdentity.value).toBe(true)
    expect(google.hasPasswordIdentity.value).toBe(true)
  })
})

// ── onConnect ────────────────────────────────────────────────────────────────

describe('useGoogleActions — onConnect', () => {
  test('calls session.linkGoogleIdentity and toggles loading', async () => {
    mockLinkGoogleIdentity.mockResolvedValueOnce(undefined)
    mockGetUser.mockResolvedValueOnce({ id: 'u1', aud: 'authenticated' })
    const google = useGoogleActions()

    const promise = google.onConnect()
    expect(google.loading.value).toBe(true)
    await promise

    expect(mockLinkGoogleIdentity).toHaveBeenCalledOnce()
    expect(google.loading.value).toBe(false)
  })

  test('shows an error toast when linking fails', async () => {
    mockLinkGoogleIdentity.mockRejectedValueOnce(new Error('popup blocked'))
    const google = useGoogleActions()

    await google.onConnect()

    expect(mockToast.error).toHaveBeenCalledWith('account-access-modal.google.connect-error')
    expect(google.loading.value).toBe(false)
  })
})

// ── onDisconnect ─────────────────────────────────────────────────────────────

describe('useGoogleActions — onDisconnect', () => {
  test('does nothing when the confirm alert is cancelled', async () => {
    confirmResponse(false)
    const google = useGoogleActions()

    await google.onDisconnect()

    expect(mockUnlinkGoogleIdentity).not.toHaveBeenCalled()
  })

  test('unlinks the google identity when the confirm alert is accepted', async () => {
    confirmResponse(true)
    mockUnlinkGoogleIdentity.mockResolvedValueOnce(undefined)
    mockGetUser.mockResolvedValueOnce({ id: 'u1', aud: 'authenticated', identities: [] })
    const google = useGoogleActions()

    await google.onDisconnect()

    expect(mockUnlinkGoogleIdentity).toHaveBeenCalledOnce()
    expect(google.loading.value).toBe(false)
  })

  test('shows an error toast when unlinking fails', async () => {
    confirmResponse(true)
    mockUnlinkGoogleIdentity.mockRejectedValueOnce(new Error('cannot unlink last identity'))
    const google = useGoogleActions()

    await google.onDisconnect()

    expect(mockToast.error).toHaveBeenCalledWith('account-access-modal.google.disconnect-error')
    expect(google.loading.value).toBe(false)
  })
})
