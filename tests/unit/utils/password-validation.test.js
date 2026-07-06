import { describe, test, expect } from 'vite-plus/test'
import { validatePasswordFields } from '@/utils/password-validation'

const messages = {
  required: 'password required',
  tooShort: 'password too short',
  confirmRequired: 'confirm required',
  mismatch: 'passwords do not match'
}

describe('validatePasswordFields', () => {
  test('empty password produces a required error', () => {
    const errors = validatePasswordFields('', 'anything123', messages)
    expect(errors.password).toBe(messages.required)
  })

  test('password under 8 characters produces a too-short error', () => {
    const errors = validatePasswordFields('short12', 'short12', messages)
    expect(errors.password).toBe(messages.tooShort)
  })

  test('empty confirm password produces a confirm-required error', () => {
    const errors = validatePasswordFields('longenough1', '', messages)
    expect(errors.confirm_password).toBe(messages.confirmRequired)
  })

  test('mismatched confirm password produces a mismatch error', () => {
    const errors = validatePasswordFields('longenough1', 'different1', messages)
    expect(errors.confirm_password).toBe(messages.mismatch)
  })

  test('valid matching 8+ char password returns no errors', () => {
    const errors = validatePasswordFields('longenough1', 'longenough1', messages)
    expect(errors).toEqual({})
  })
})
