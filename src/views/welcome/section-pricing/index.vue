<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeader from '../section-header.vue'
import PlanGrid from './plan-grid.vue'

const { t } = useI18n()
</script>

<template>
  <section data-testid="welcome-pricing" class="w-full bg-brown-200 dark:bg-grey-800 py-30">
    <div
      class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14 items-center"
    >
      <section-header
        :eyebrow="t('welcome-view.pricing.eyebrow')"
        :heading="t('welcome-view.pricing.heading')"
        :subtitle="t('welcome-view.pricing.subtitle')"
      />

      <plan-grid />

      <div
        data-testid="welcome-pricing__footnote"
        class="w-full flex items-center gap-5 bg-brown-50 dark:bg-stone-700 rounded-5.5 px-7 py-5"
      >
        <span aria-hidden="true" class="text-4xl text-orange-700 leading-none">✿</span>
        <p class="text-base leading-relaxed text-brown-700 dark:text-brown-100">
          {{ t('welcome-view.pricing.footnote') }}
        </p>
      </div>
    </div>
  </section>
</template>
