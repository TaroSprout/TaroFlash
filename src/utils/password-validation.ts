export type PasswordFieldErrors = Partial<Record<'password' | 'confirm_password', string>>

export type PasswordValidationMessages = {
  required: string
  tooShort: string
  confirmRequired: string
  mismatch: string
}

/** Shared password + confirm-password checks: required, min 8 chars, must match. */
export function validatePasswordFields(
  password: string,
  confirm_password: string,
  messages: PasswordValidationMessages
): PasswordFieldErrors {
  const errors: PasswordFieldErrors = {}

  if (!password) errors.password = messages.required
  else if (password.length < 8) errors.password = messages.tooShort

  if (!confirm_password) errors.confirm_password = messages.confirmRequired
  else if (confirm_password !== password) errors.confirm_password = messages.mismatch

  return errors
}
