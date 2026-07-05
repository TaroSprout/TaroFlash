<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlanOption from './plan-option.vue'
import { PLANS } from '@/config/plans'

const { t } = useI18n()
</script>

<template>
  <div data-testid="plan-grid" class="grid grid-cols-2 gap-3.5">
    <plan-option
      plan-id="free"
      :name="PLANS.free.displayName"
      :price="t('signup-dialog.plan-free.price')"
      :features="PLANS.free.features"
      data-theme="brown-100"
      data-theme-dark="stone-700"
    />

    <plan-option
      plan-id="paid"
      :name="PLANS.paid.displayName"
      :price="t('signup-dialog.plan-paid.price', { price: PLANS.paid.monthlyPriceUsd })"
      :features="PLANS.paid.features"
      data-theme="blue-500"
      data-theme-dark="blue-650"
    />
  </div>
</template>
