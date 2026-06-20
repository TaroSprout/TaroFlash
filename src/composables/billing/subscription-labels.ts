import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useSubscriptionQuery } from '@/api/billing'
import { formatMoney, formatStripeDate } from '@/utils/billing'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

/**
 * Decodes the raw Stripe subscription payload into display-ready, reactive
 * i18n labels for the plan pill. Each label is a ComputedRef that re-resolves
 * when the query data or active locale changes; a label is `null` when it
 * shouldn't render — `status_label` is null for an active subscription,
 * `upcoming_charge_label` is null once the plan is set to cancel.
 *
 * @example
 * const { subscription, price_label, status_label } = useSubscriptionLabels(query)
 */
export function useSubscriptionLabels(subscriptionQuery: SubscriptionQuery) {
  const { t, locale } = useI18n()

  const subscription = computed(() => subscriptionQuery.data.value?.subscription ?? null)

  const price_label = computed(() => {
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

  const upcoming_charge_label = computed(() => {
    if (!subscription.value || subscription.value.cancel_at_period_end) return null

    const date = formatStripeDate(subscription.value.current_period_end, locale.value)
    const upcoming = subscriptionQuery.data.value?.upcoming
    if (!upcoming) return t('settings.subscription.plan.renews-on', { date })

    const amount = formatMoney(upcoming.amount_due, upcoming.currency, locale.value)
    return t('settings.subscription.plan.upcoming-charge', { amount, date })
  })

  const cancel_label = computed(() => {
    if (!subscription.value?.cancel_at_period_end) return null

    const date = formatStripeDate(subscription.value.current_period_end, locale.value)
    return t('settings.subscription.plan.cancels-on', { date })
  })

  return { subscription, price_label, status_label, upcoming_charge_label, cancel_label }
}
