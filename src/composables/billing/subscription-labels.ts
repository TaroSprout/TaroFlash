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

  const subscription = computed(() => subscriptionQuery.data.value?.subscription ?? null)

  const cost = computed(() => {
    const price = subscription.value?.items.data[0]?.price
    if (!price?.unit_amount) return null

    const amount = (price.unit_amount / 100).toFixed(2)
    const currency = price.currency.toUpperCase()
    const interval = price.recurring?.interval ?? null

    return interval
      ? t('settings.subscription.plan.price-per-interval', { amount, currency, interval })
      : t('settings.subscription.plan.price', { amount, currency })
  })

  const status_label = computed(() => {
    const status = subscription.value?.status
    if (!status || status === 'active') return null

    return t(`settings.subscription.plan.status.${status}`, status)
  })

  const renewal_label = computed(() => {
    const sub = subscription.value
    if (!sub) return null

    const date = formatStripeDate(sub.current_period_end, locale.value)
    if (sub.cancel_at_period_end) return t('settings.subscription.plan.cancels-on', { date })

    const upcoming = subscriptionQuery.data.value?.upcoming
    if (!upcoming) return t('settings.subscription.plan.renews-on', { date })

    const amount = formatMoney(upcoming.amount_due, upcoming.currency, locale.value)
    return t('settings.subscription.plan.upcoming-charge', { amount, date })
  })

  const description = computed(() =>
    [status_label.value, renewal_label.value].filter(Boolean).join(' · ')
  )

  return { subscription, cost, description }
}
