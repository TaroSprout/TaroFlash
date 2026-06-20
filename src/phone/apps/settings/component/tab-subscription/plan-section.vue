<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import UiButton from '@/components/ui-kit/button.vue'
import PlanPill from './plan-pill.vue'
import { useCancelSubscriptionMutation, useResumeSubscriptionMutation } from '@/api/billing'
import type { useSubscriptionQuery } from '@/api/billing'
import { useToast } from '@/composables/toast'
import { formatShortDate } from '@/utils/date'
import { PLANS } from '@/config/plans'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

type PlanSectionProps = {
  subscriptionQuery: SubscriptionQuery
}

const { subscriptionQuery } = defineProps<PlanSectionProps>()

const { t, locale } = useI18n()
const toast = useToast()
const cancelMutation = useCancelSubscriptionMutation()
const resumeMutation = useResumeSubscriptionMutation()

const confirming_cancel = ref(false)

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
  const ts = subscription.value.current_period_end * 1000
  const date = formatShortDate(ts, locale.value)
  const upcoming = subscriptionQuery.data.value?.upcoming
  if (!upcoming) return t('settings.subscription.plan.renews-on', { date })
  const amount = new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: upcoming.currency.toUpperCase()
  }).format(upcoming.amount_due / 100)
  return t('settings.subscription.plan.upcoming-charge', { amount, date })
})

const cancel_label = computed(() => {
  if (!subscription.value?.cancel_at_period_end) return null
  const ts = subscription.value.current_period_end * 1000
  return t('settings.subscription.plan.cancels-on', { date: formatShortDate(ts, locale.value) })
})

async function onCancel() {
  try {
    await cancelMutation.mutateAsync(true)
    confirming_cancel.value = false
    toast.success(t('settings.subscription.plan.cancel-success'))
  } catch {
    toast.error(t('settings.subscription.plan.cancel-error'))
  }
}

async function onResume() {
  try {
    await resumeMutation.mutateAsync()
    toast.success(t('settings.subscription.plan.resume-success'))
  } catch {
    toast.error(t('settings.subscription.plan.resume-error'))
  }
}
</script>

<template>
  <labeled-section
    data-testid="billing-settings__plan"
    :label="t('settings.subscription.plan.label')"
  >
    <plan-pill
      data-theme="blue-500"
      data-theme-dark="blue-650"
      :name="PLANS.paid.displayName"
      :cost="price_label"
    >
      <template #meta>
        <span v-if="status_label" data-testid="billing-settings__plan-status">
          {{ status_label }}
        </span>
        <span
          v-if="status_label && (upcoming_charge_label || cancel_label)"
          data-testid="billing-settings__plan-meta-divider"
          aria-hidden="true"
          class="text-brown-300"
        >
          |
        </span>
        <span v-if="upcoming_charge_label" data-testid="billing-settings__plan-upcoming">
          {{ upcoming_charge_label }}
        </span>
        <span v-else-if="cancel_label" data-testid="billing-settings__plan-cancel-date">
          {{ cancel_label }}
        </span>
      </template>

      <template v-if="!subscription?.cancel_at_period_end && !confirming_cancel" #cta>
        <ui-button
          data-testid="billing-settings__plan-cancel"
          data-theme="red-500"
          data-theme-dark="red-600"
          size="sm"
          @press="confirming_cancel = true"
        >
          {{ t('settings.subscription.plan.cancel') }}
        </ui-button>
      </template>

      <template v-if="subscription?.cancel_at_period_end || confirming_cancel" #actions>
        <ui-button
          v-if="subscription?.cancel_at_period_end"
          data-testid="billing-settings__plan-resume"
          data-theme="green-400"
          size="sm"
          :loading="resumeMutation.isLoading.value"
          @press="onResume"
        >
          {{ t('settings.subscription.plan.resume') }}
        </ui-button>

        <template v-else>
          <p
            data-testid="billing-settings__plan-cancel-prompt"
            class="w-full text-sm text-brown-700 dark:text-brown-300"
          >
            {{ t('settings.subscription.plan.cancel-confirm') }}
          </p>
          <ui-button
            data-testid="billing-settings__plan-cancel-confirm"
            data-theme="red-500"
            size="sm"
            :loading="cancelMutation.isLoading.value"
            @press="onCancel"
          >
            {{ t('settings.subscription.plan.cancel-confirm-button') }}
          </ui-button>
          <ui-button
            data-testid="billing-settings__plan-cancel-abort"
            data-theme="grey-400"
            size="sm"
            @press="confirming_cancel = false"
          >
            {{ t('settings.subscription.plan.cancel-abort') }}
          </ui-button>
        </template>
      </template>
    </plan-pill>
  </labeled-section>
</template>
