<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import type { useSubscriptionQuery } from '@/api/billing'
import { useUpgradeClick } from './use-upgrade-click'

type SubscriptionQuery = ReturnType<typeof useSubscriptionQuery>
type Subscription = SubscriptionQuery['data']['value']

type PlanActionsProps = {
  subscription: Subscription
}

const { subscription } = defineProps<PlanActionsProps>()

const { t } = useI18n()
const { onUpgradeClick, onCancel, onResume, canceling, resuming } = useUpgradeClick()
</script>

<template>
  <ui-button
    v-if="!subscription"
    data-testid="tab-subscription__upgrade"
    data-palette="yellow"
    size="sm"
    icon-left="triangle-eye"
    @press="onUpgradeClick"
  >
    {{ t('settings.subscription.free.upgrade') }}
  </ui-button>

  <ui-button
    v-else-if="!subscription.cancelAtPeriodEnd"
    data-testid="billing-settings__plan-cancel"
    data-palette="danger"
    size="sm"
    :loading="canceling"
    @press="onCancel"
  >
    {{ t('settings.subscription.plan.cancel') }}
  </ui-button>

  <ui-button
    neutral
    v-else
    data-testid="billing-settings__plan-resume"
    size="sm"
    :loading="resuming"
    @press="onResume"
  >
    {{ t('settings.subscription.plan.resume') }}
  </ui-button>
</template>
