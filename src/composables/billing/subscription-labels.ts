import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useSubscriptionQuery } from '@/api/billing'
import { formatMoney, formatStripeDate } from '@/utils/billing'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

/**
 * Decodes the raw Stripe subscription payload into the display-ready strings
 * the plan pill renders: `cost` (formatted price) and `description` (status +
 * renewal/cancel line, joined). Both are ComputedRefs that re-resolve when the
 * query data or active locale changes, and are `null` when there's nothing to
 * show. `subscription` is exposed for callers that branch on cancel state.
 *
 * @example
 * const { subscription, cost, description } = useSubscriptionLabels(query)
 */
export function useSubscriptionLabels(subscriptionQuery: SubscriptionQuery) {
  const { t, locale } = useI18n()

  const subscription = computed(() => subscriptionQuery.data.value ?? null)

  const cost = computed(() => {
    const sub = subscription.value
    if (!sub?.priceCents || !sub.currency) return null

    const amount = formatMoney(sub.priceCents, sub.currency, locale.value)
    return sub.interval
      ? t('settings.subscription.plan.price-per-interval', { amount, interval: sub.interval })
      : amount
  })

  const status_label = computed(() => {
    const sub = subscription.value
    if (!sub) return null

    // A soft-cancel keeps Stripe `status: 'active'`, so surface it explicitly.
    if (sub.cancelAtPeriodEnd) return t('settings.subscription.plan.status.canceling')
    if (sub.status === 'active') return null

    return t(`settings.subscription.plan.status.${sub.status}`, sub.status)
  })

  const renewal_label = computed(() => {
    const sub = subscription.value
    if (!sub) return null

    const date = formatStripeDate(sub.currentPeriodEnd, locale.value)
    if (sub.cancelAtPeriodEnd) return t('settings.subscription.plan.ends-on', { date })

    if (!sub.upcoming) return t('settings.subscription.plan.renews-on', { date })

    const amount = formatMoney(sub.upcoming.amountCents, sub.upcoming.currency, locale.value)
    return t('settings.subscription.plan.upcoming-charge', { amount, date })
  })

  const description = computed(() =>
    [status_label.value, renewal_label.value].filter(Boolean).join(' | ')
  )

  return { subscription, cost, description }
}
