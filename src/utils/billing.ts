import { formatShortDate } from './date'

/** Format a Stripe minor-unit amount (cents) as a localized currency string. */
export function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(cents / 100)
}

/** Format a Stripe UNIX timestamp (seconds) as a localized short date. */
export function formatStripeDate(unix_seconds: number, locale: string): string {
  return formatShortDate(unix_seconds * 1000, locale)
}

/** Format a card's expiry month/year as `MM/YY`. */
export function formatCardExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
}
