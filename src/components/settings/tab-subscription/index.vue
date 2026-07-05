<script setup lang="ts">
import SectionList from '@/components/layout-kit/section-list.vue'
import PlanSection from './plan-section.vue'
import PaymentMethodsSection from './payment-methods-section.vue'
import { useMemberStore } from '@/stores/member'
import { useSubscriptionQuery } from '@/api/billing'

const member_store = useMemberStore()
const subscription_query = useSubscriptionQuery()
</script>

<template>
  <section-list
    data-testid="tab-subscription"
    class="px-(--settings-padding) pb-(--settings-padding)"
  >
    <plan-section :subscription-query="subscription_query" />
    <payment-methods-section v-if="member_store.plan === 'paid'" />
  </section-list>
</template>
