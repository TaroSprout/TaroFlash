<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import UiButton from '@/components/ui-kit/button.vue'
import PlanPill from './plan-pill.vue'
import { useCancelSubscriptionMutation, useResumeSubscriptionMutation } from '@/api/billing'
import type { useSubscriptionQuery } from '@/api/billing'
import { useToast } from '@/composables/toast'
import { useAlert } from '@/composables/alert'
import { useSubscriptionLabels } from '@/composables/billing/subscription-labels'
import { PLANS } from '@/config/plans'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

type PlanSectionProps = {
  subscriptionQuery: SubscriptionQuery
}

const { subscriptionQuery } = defineProps<PlanSectionProps>()

const { t } = useI18n()
const toast = useToast()
const alert = useAlert()
const cancelMutation = useCancelSubscriptionMutation()
const resumeMutation = useResumeSubscriptionMutation()

const { subscription, cost, description } = useSubscriptionLabels(subscriptionQuery)

async function onCancel() {
  const { response } = alert.warn({
    title: t('settings.subscription.plan.cancel-confirm-title'),
    message: t('settings.subscription.plan.cancel-confirm'),
    confirmLabel: t('settings.subscription.plan.cancel-confirm-button'),
    cancelLabel: t('settings.subscription.plan.cancel-abort')
  })
  if (!(await response)) return

  try {
    await cancelMutation.mutateAsync(true)
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
      :cost="cost"
      :description="description"
    >
      <template #actions>
        <ui-button
          v-if="!subscription?.cancel_at_period_end"
          data-testid="billing-settings__plan-cancel"
          data-theme="red-500"
          data-theme-dark="red-600"
          size="sm"
          :loading="cancelMutation.isLoading.value"
          @press="onCancel"
        >
          {{ t('settings.subscription.plan.cancel') }}
        </ui-button>

        <ui-button
          v-else
          data-testid="billing-settings__plan-resume"
          data-theme="green-400"
          size="sm"
          :loading="resumeMutation.isLoading.value"
          @press="onResume"
        >
          {{ t('settings.subscription.plan.resume') }}
        </ui-button>
      </template>
    </plan-pill>
  </labeled-section>
</template>
