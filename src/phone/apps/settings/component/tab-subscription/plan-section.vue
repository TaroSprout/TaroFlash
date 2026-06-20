<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import PlanPill from './plan-pill.vue'
import PlanActions from './plan-actions.vue'
import type { useSubscriptionQuery } from '@/api/billing'
import { useSubscriptionLabels } from '@/composables/billing/subscription-labels'
import { PLANS } from '@/config/plans'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

type PlanSectionProps = {
  subscriptionQuery: SubscriptionQuery
}

const { subscriptionQuery } = defineProps<PlanSectionProps>()

const { t } = useI18n()

const { subscription, cost, description } = useSubscriptionLabels(subscriptionQuery)

const view = computed(() =>
  subscription.value
    ? {
        label: t('settings.subscription.plan.label'),
        theme: 'blue-500',
        theme_dark: 'blue-650',
        name: PLANS.paid.displayName,
        cost: cost.value,
        description: description.value
      }
    : {
        label: t('settings.subscription.free.label'),
        theme: 'green-400',
        theme_dark: 'green-400',
        name: PLANS.free.displayName,
        cost: t('settings.subscription.free.cost'),
        description: t('settings.subscription.free.status')
      }
)
</script>

<template>
  <labeled-section data-testid="billing-settings__plan" :label="view.label">
    <plan-pill
      :data-theme="view.theme"
      :data-theme-dark="view.theme_dark"
      :name="view.name"
      :cost="view.cost"
      :description="view.description"
    >
      <template #actions>
        <plan-actions :subscription="subscription" />
      </template>
    </plan-pill>
  </labeled-section>
</template>
