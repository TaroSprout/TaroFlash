<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PlanOption from './plan-option.vue'

defineProps<{
  selected_plan: MemberPlan
}>()

const emit = defineEmits<{
  (e: 'select', plan: MemberPlan): void
}>()

const { t } = useI18n()
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
        :name="t('signup-dialog.plan-free')"
        class="text-brown-500"
      >
        <template #header>
          <h2 class="text-4xl">{{ t('signup-dialog.plan-free.price') }}</h2>
        </template>

        <p>{{ t('signup-dialog.free-plan.deck-limit') }}</p>
        <p>{{ t('signup-dialog.free-plan.card-limit') }}</p>
        <p>{{ t('signup-dialog.free-plan.deck-image-upload') }}</p>
        <p>{{ t('signup-dialog.free-plan.future-features-note') }}</p>
      </plan-option>

      <plan-option
        :selected="selected_plan === 'paid'"
        @select="emit('select', 'paid')"
        theme="blue-500"
        :name="t('signup-dialog.plan-paid')"
        class="text-brown-100"
      >
        <template #header>
          <h2
            class="text-4xl *:[span]:text-lg"
            v-html="t('signup-dialog.plan-paid.price', { price: 8 })"
          ></h2>
        </template>

        <p>{{ t('signup-dialog.paid-plan.unlimited-decks') }}</p>
        <p>{{ t('signup-dialog.paid-plan.unlimited-cards') }}</p>
        <p>{{ t('signup-dialog.paid-plan.deck-image-upload') }}</p>
        <p>{{ t('signup-dialog.paid-plan.card-image-upload') }}</p>
        <p>{{ t('signup-dialog.paid-plan.future-features-note') }}</p>
        <p>{{ t('signup-dialog.paid-plan.cancel-anytime') }}</p>
      </plan-option>
    </div>
  </div>
</template>
