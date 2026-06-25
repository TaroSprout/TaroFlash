<script setup lang="ts">
import SectionList from '@/components/layout-kit/section-list.vue'
import PlanSection from './plan-section.vue'
import PaymentMethodsSection from './payment-methods-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import { useMemberStore } from '@/stores/member'
import { useSubscriptionQuery } from '@/api/billing'

const member_store = useMemberStore()
const subscription_query = useSubscriptionQuery()

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list
    data-testid="tab-subscription"
    class="max-h-full overflow-y-auto p-(--settings-padding)"
  >
    <settings-back-button @back="emit('back')" />

    <plan-section :subscription-query="subscription_query" />
    <payment-methods-section v-if="member_store.plan === 'paid'" />
  </section-list>
</template>
