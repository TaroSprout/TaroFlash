<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionList from '@/components/layout-kit/section-list.vue'
import FreePlanSection from './free-plan-section.vue'
import PlanSection from './plan-section.vue'
import PaymentMethodsSection from './payment-methods-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import { useMemberStore } from '@/stores/member'
import { useSubscriptionQuery } from '@/api/billing'

const { t } = useI18n()
const member_store = useMemberStore()
const subscription_query = useSubscriptionQuery()

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list data-testid="tab-subscription" class="max-h-full overflow-y-auto">
    <settings-back-button @back="emit('back')" />

    <free-plan-section v-if="member_store.plan !== 'paid'" />

    <template v-else>
      <p
        v-if="subscription_query.isLoading.value"
        data-testid="tab-subscription__loading"
        class="text-brown-600 dark:text-brown-300 text-center py-8"
      >
        {{ t('settings.subscription.section-loading') }}
      </p>

      <p
        v-else-if="subscription_query.error.value"
        data-testid="tab-subscription__error"
        class="text-red-500 text-center py-8"
      >
        {{ t('settings.subscription.error') }}
      </p>

      <template v-else>
        <plan-section :subscription-query="subscription_query" />
        <payment-methods-section />
      </template>
    </template>
  </section-list>
</template>
