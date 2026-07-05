<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeader from '../section-header.vue'
import PlanGrid from './plan-grid.vue'

const { t } = useI18n()
</script>

<template>
  <section
    data-testid="welcome-pricing"
    class="w-full bg-green-500 dark:bg-green-800 py-30 wave-top-[30px] bgx-diagonal-stripes bgx-size-24 bgx-opacity-6"
  >
    <div
      class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14 items-center"
    >
      <section-header
        :heading="t('welcome-view.pricing.heading')"
        :subtitle="t('welcome-view.pricing.subtitle')"
      />

      <plan-grid />
    </div>
  </section>
</template>
