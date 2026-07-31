import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

/**
 * The app's single i18n instance. Lives in its own module so non-component
 * code can translate: `useI18n()` needs an active component setup, which a
 * router guard or a store action doesn't have. Importing from `main.ts` would
 * work for that too, but main imports the router, so anything the router
 * reaches would close a cycle.
 *
 * Components should still use `useI18n()` — it keeps them reactive to a locale
 * change. Reach for `t` below only where no component exists.
 */
export const i18n = createI18n({
  locale: 'en-us',
  legacy: false,
  escapeParameter: false,
  messages
})

/**
 * Wrapped rather than re-exported: `i18n.global.t`'s inferred type can't be
 * named without reaching into @intlify internals, which vue-tsc rejects as
 * non-portable. The narrow signature is all non-component callers need anyway.
 */
export function t(key: string, named: Record<string, unknown> = {}): string {
  return i18n.global.t(key, named)
}

/** The active locale tag, for Intl formatters outside a component. */
export function currentLocale(): string {
  return i18n.global.locale.value
}
