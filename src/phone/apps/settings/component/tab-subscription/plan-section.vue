<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import UiButton from '@/components/ui-kit/button.vue'
import PlanPill from './plan-pill.vue'
import type { useSubscriptionQuery } from '@/api/billing'
import { useSubscriptionLabels } from '@/composables/billing/subscription-labels'
import { useSubscriptionActions } from '@/composables/member/subscription-actions'
import { PLANS } from '@/config/plans'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

type PlanSectionProps = {
  subscriptionQuery: SubscriptionQuery
}

const { subscriptionQuery } = defineProps<PlanSectionProps>()

const { t } = useI18n()

const { subscription, cost, description } = useSubscriptionLabels(subscriptionQuery)
const { onCancel, onResume, canceling, resuming } = useSubscriptionActions()
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
          :loading="canceling"
          @press="onCancel"
        >
          {{ t('settings.subscription.plan.cancel') }}
        </ui-button>

        <ui-button
          v-else
          data-testid="billing-settings__plan-resume"
          data-theme="green-400"
          size="sm"
          :loading="resuming"
          @press="onResume"
        >
          {{ t('settings.subscription.plan.resume') }}
        </ui-button>
      </template>
    </plan-pill>
  </labeled-section>
</template>
