<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlanOption from './plan-option.vue'
import { PLANS } from '@/config/plans'
import type { PlanFeature } from '@/config/plans'

const { t } = useI18n()

function featureLabel(planId: MemberPlan, feature: PlanFeature) {
  const key = `plans.${planId}.features.${feature.key}`
  if (feature.count == null) return t(key)
  return t(key, { count: feature.count })
}
</script>

<template>
  <div data-testid="plan-grid" class="grid grid-cols-2 gap-3.5">
    <plan-option
      :name="PLANS.free.displayName"
      :price="t('signup-dialog.plan-free.price')"
      data-theme="brown-100"
      data-theme-dark="stone-700"
    >
      <li v-for="feature in PLANS.free.features" :key="feature.key" class="text-base">
        {{ featureLabel('free', feature) }}
      </li>
    </plan-option>

    <plan-option
      :name="PLANS.paid.displayName"
      :price="t('signup-dialog.plan-paid.price', { price: PLANS.paid.monthlyPriceUsd })"
      data-theme="blue-500"
      data-theme-dark="blue-650"
    >
      <li v-for="feature in PLANS.paid.features" :key="feature.key" class="text-base">
        {{ featureLabel('paid', feature) }}
      </li>
    </plan-option>
  </div>
</template>
