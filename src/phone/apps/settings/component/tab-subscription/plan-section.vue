<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import PlanPill from './plan-pill.vue'
import PlanActions from './plan-actions.vue'
import type { useSubscriptionQuery } from '@/api/billing'
import { useMemberStore } from '@/stores/member'
import { useSubscriptionLabels } from '@/composables/billing/subscription-labels'
import { PLANS } from '@/config/plans'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>

type PlanSectionProps = {
  subscriptionQuery: SubscriptionQuery
}

const { subscriptionQuery } = defineProps<PlanSectionProps>()

const { t } = useI18n()
const member_store = useMemberStore()

const { subscription, cost, description } = useSubscriptionLabels(subscriptionQuery)

// Free vs paid is known instantly from client state; the Stripe payload (cost,
// renewal, actions) is what we wait on — so it drives the skeleton, not the
// free/paid identity of the pill.
const is_paid = computed(() => member_store.plan === 'paid')
const loading = computed(() => is_paid.value && subscriptionQuery.isLoading.value)
const errored = computed(() => is_paid.value && !!subscriptionQuery.error.value)

const view = computed(() =>
  is_paid.value
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
    <p
      v-if="errored"
      data-testid="billing-settings__plan-error"
      class="text-red-500 py-4 text-center"
    >
      {{ t('settings.subscription.error') }}
    </p>

    <plan-pill
      v-else
      :data-theme="view.theme"
      :data-theme-dark="view.theme_dark"
      :loading="true"
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
