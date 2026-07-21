import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref, nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: vi.fn() }))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useMatchMedia } from '@/composables/ui/media-query'
import { useEditorBreakpointSync } from '@/views/deck/composables/editor-breakpoint-sync'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeShell(mode = 'edit') {
  return {
    mode: ref(mode),
    exitMode: vi.fn(),
    setMode: vi.fn()
  }
}

function makeEditor(pending = null) {
  return { pending_focus_client_id: ref(pending) }
}

function makeMobileEditor({ is_open = false, current = null } = {}) {
  return {
    is_open: ref(is_open),
    current: ref(current),
    open_at: vi.fn(),
    close: vi.fn()
  }
}

// Focus a fake desktop editor row so `document.activeElement.closest(...)`
// resolves to a row carrying `client_id`.
function focusDesktopRow(client_id) {
  const row = document.createElement('div')
  row.setAttribute('data-testid', 'list-item-card')
  row.dataset.clientId = client_id

  const input = document.createElement('input')
  row.appendChild(input)
  document.body.appendChild(row)
  input.focus()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let is_mobile

beforeEach(() => {
  is_mobile = ref(false)
  useMatchMedia.mockReset()
  useMatchMedia.mockReturnValue(is_mobile)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useEditorBreakpointSync — shrink (desktop → mobile)', () => {
  test('leaves desktop edit and opens the mobile editor on the focused card', async () => {
    const shell = makeShell('edit')
    const editor = makeEditor()
    const mobile = makeMobileEditor()
    focusDesktopRow('cid-focused')

    useEditorBreakpointSync(shell, editor, mobile)
    is_mobile.value = true
    await nextTick()

    expect(shell.exitMode).toHaveBeenCalledOnce()
    expect(mobile.open_at).toHaveBeenCalledWith('cid-focused')
  })

  test('falls back to the staged card awaiting focus when nothing is focused', async () => {
    const shell = makeShell('edit')
    const editor = makeEditor('cid-staged')
    const mobile = makeMobileEditor()

    useEditorBreakpointSync(shell, editor, mobile)
    is_mobile.value = true
    await nextTick()

    expect(mobile.open_at).toHaveBeenCalledWith('cid-staged')
  })

  test('opens the mobile editor at its default when no card is focused or staged', async () => {
    const shell = makeShell('edit')
    const editor = makeEditor()
    const mobile = makeMobileEditor()

    useEditorBreakpointSync(shell, editor, mobile)
    is_mobile.value = true
    await nextTick()

    expect(mobile.open_at).toHaveBeenCalledWith(undefined)
  })

  test('does nothing when the desktop editor is not open (mode is view)', async () => {
    const shell = makeShell('view')
    const editor = makeEditor()
    const mobile = makeMobileEditor()

    useEditorBreakpointSync(shell, editor, mobile)
    is_mobile.value = true
    await nextTick()

    expect(shell.exitMode).not.toHaveBeenCalled()
    expect(mobile.open_at).not.toHaveBeenCalled()
  })
})

describe('useEditorBreakpointSync — grow (mobile → desktop)', () => {
  test('closes the mobile editor and enters desktop edit on the cursor card', async () => {
    is_mobile.value = true
    const shell = makeShell('view')
    const editor = makeEditor()
    const mobile = makeMobileEditor({ is_open: true, current: { client_id: 'cid-cursor' } })

    useEditorBreakpointSync(shell, editor, mobile)
    is_mobile.value = false
    await nextTick()

    expect(editor.pending_focus_client_id.value).toBe('cid-cursor')
    expect(mobile.close).toHaveBeenCalledOnce()
    expect(shell.setMode).toHaveBeenCalledWith('edit')
  })

  test('does nothing when the mobile editor is not open', async () => {
    is_mobile.value = true
    const shell = makeShell('view')
    const editor = makeEditor()
    const mobile = makeMobileEditor({ is_open: false })

    useEditorBreakpointSync(shell, editor, mobile)
    is_mobile.value = false
    await nextTick()

    expect(mobile.close).not.toHaveBeenCalled()
    expect(shell.setMode).not.toHaveBeenCalled()
    expect(editor.pending_focus_client_id.value).toBeNull()
  })
})
