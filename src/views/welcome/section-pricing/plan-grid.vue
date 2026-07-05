<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlanOption from './plan-option.vue'
import { PLANS } from '@/config/plans'

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="plan-grid"
    data-theme="brown-50"
    data-theme-dark="stone-900"
    class="grid grid-cols-1 mlg:grid-cols-2 max-mlg:w-full gap-3.5"
  >
    <plan-option
      plan-id="free"
      :name="PLANS.free.displayName"
      :price="t('signup-dialog.plan-free.price')"
      :features="PLANS.free.features"
    />

    <plan-option
      plan-id="paid"
      :name="PLANS.paid.displayName"
      :price="t('signup-dialog.plan-paid.price', { price: PLANS.paid.monthlyPriceUsd })"
      :features="PLANS.paid.features"
    />
  </div>
</template>
