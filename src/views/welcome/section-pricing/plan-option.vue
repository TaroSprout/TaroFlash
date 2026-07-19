<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import type { PlanFeature } from '@/config/plans'

const { planId, name, price, features } = defineProps<{
  planId: MemberPlan
  name: string
  price: string
  features: PlanFeature[]
}>()

const { t } = useI18n()

function featureLabel(feature: PlanFeature) {
  const key = `plans.${planId}.features.${feature.key}`
  if (feature.count == null) return t(key)
  return t(key, { count: feature.count })
}
</script>

<template>
  <div
    data-testid="plan-option"
    class="w-full h-full mlg:min-w-94 flex flex-col gap-5 rounded-9 p-12 bg-float text-ink"
  >
    <div data-testid="plan-option__header" class="flex items-center justify-between gap-4">
      <p data-testid="plan-option__name" class="text-3xl">{{ name }}</p>
      <p data-testid="plan-option__price" class="text-lg *:[span]:text-sm" v-html="price"></p>
    </div>

    <hr data-testid="plan-option__divider" class="w-full border-t border-ink" />

    <ul data-testid="plan-option__list" class="flex flex-col gap-3 text-start">
      <li
        v-for="feature in features"
        :key="feature.key"
        :data-ok="feature.ok !== false ? undefined : 'false'"
        class="flex items-start gap-3 text-base"
      >
        <span
          aria-hidden="true"
          class="flex shrink-0 items-center justify-center size-6 rounded-full"
          :class="
            feature.ok !== false ? 'bg-ink text-float' : 'border-2 border-dashed border-ink/50'
          "
        >
          <ui-icon v-if="feature.ok !== false" src="check" class="size-3" />
        </span>
        <span :class="{ 'opacity-55': feature.ok === false }">{{ featureLabel(feature) }}</span>
      </li>
    </ul>
  </div>
</template>
