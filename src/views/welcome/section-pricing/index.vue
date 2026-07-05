<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeader from '../section-header.vue'
import PlanGrid from './plan-grid.vue'

const { t } = useI18n()
</script>

<template>
  <section
    data-testid="welcome-pricing"
    data-theme="green-500"
    data-theme-dark="green-800"
    class="w-full bg-green-500 dark:bg-green-800 py-25 sm:py-30 mlg:py-40 wave-top-[30px] bgx-diagonal-stripes bgx-size-24 bgx-opacity-6"
  >
    <div
      class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14 items-center"
    >
      <section-header
        :heading="t('welcome-view.pricing.heading')"
        :subtitle="t('welcome-view.pricing.subtitle')"
      />

      <plan-grid />

      <p
        data-testid="welcome-pricing__footnote"
        class="text-(--theme-on-primary) text-center text-lg whitespace-normal xs:whitespace-pre-line *:[span]:bg-(--theme-on-primary) *:[span]:text-(--theme-primary) *:[span]:px-1 *:[span]:py-0.5 *:[span]:rounded-1.5 *:[span]:inline-block px-1"
        v-html="t('welcome-view.pricing.footnote')"
      ></p>
    </div>
  </section>
</template>
