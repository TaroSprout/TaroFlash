<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlanOption from './plan-option.vue'
import { PLANS } from '@/config/plans'
import type { PlanFeature } from '@/config/plans'

defineProps<{
  selected_plan: MemberPlan
}>()

const emit = defineEmits<{
  (e: 'select', plan: MemberPlan): void
}>()

const { t } = useI18n()

function featureLabel(planId: MemberPlan, feature: PlanFeature) {
  const key = `plans.${planId}.features.${feature.key}`
  if (feature.count == null) return t(key)
  return t(key, { count: feature.count })
}
</script>

<template>
  <div data-testid="plan-selector" class="w-151.75 flex flex-col items-center">
    <h1 class="text-3xl text-brown-700 dark:text-brown-100">
      {{ t('signup-dialog.plan-header') }}
    </h1>
    <p
      class="text-brown-500 text-center *:[span]:text-blue-500"
      v-html="t('signup-dialog.plan-desc')"
    ></p>

    <div class="w-full grid grid-cols-2 gap-3.5 pt-10.5">
      <plan-option
        :selected="selected_plan === 'free'"
        @select="emit('select', 'free')"
        :name="PLANS.free.displayName"
        class="text-brown-500"
      >
        <template #header>
          <h2 class="text-4xl">{{ t('signup-dialog.plan-free.price') }}</h2>
        </template>

        <p v-for="feature in PLANS.free.features" :key="feature.key">
          {{ featureLabel('free', feature) }}
        </p>
      </plan-option>

      <plan-option
        :selected="selected_plan === 'paid'"
        @select="emit('select', 'paid')"
        theme="blue-500"
        :name="PLANS.paid.displayName"
        class="text-brown-100"
      >
        <template #header>
          <h2
            class="text-4xl *:[span]:text-lg"
            v-html="t('signup-dialog.plan-paid.price', { price: PLANS.paid.monthlyPriceUsd })"
          ></h2>
        </template>

        <p v-for="feature in PLANS.paid.features" :key="feature.key">
          {{ featureLabel('paid', feature) }}
        </p>
      </plan-option>
    </div>
  </div>
</template>
