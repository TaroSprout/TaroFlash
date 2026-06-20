<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import type { useSubscriptionQuery } from '@/api/billing'
import { useSubscriptionActions } from '@/composables/member/subscription-actions'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>
type Subscription = SubscriptionQuery['data']['value']

type PlanActionsProps = {
  subscription: Subscription
}

const { subscription } = defineProps<PlanActionsProps>()

const { t } = useI18n()
const { onUpgrade, onCancel, onResume, canceling, resuming } = useSubscriptionActions()
</script>

<template>
  <ui-button
    v-if="!subscription"
    data-testid="tab-subscription__upgrade"
    data-theme="yellow-500"
    size="sm"
    icon-left="moon-stars"
    @press="onUpgrade"
  >
    {{ t('settings.subscription.free.upgrade') }}
  </ui-button>

  <ui-button
    v-else-if="!subscription.cancelAtPeriodEnd"
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
    data-theme="brown-100"
    size="sm"
    :loading="resuming"
    @press="onResume"
  >
    {{ t('settings.subscription.plan.resume') }}
  </ui-button>
</template>
