<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeader from '../section-header.vue'
import PlanGrid from './plan-grid.vue'

const { t } = useI18n()
</script>

<template>
  <section
    data-testid="welcome-pricing"
    data-palette="green"
    class="w-full bg-(--color-accent) py-25 sm:py-30 mlg:py-40 wave-top-[30px] bgx-bank-note bgx-size-32 bgx-opacity-10"
  >
    <div
      class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14 items-center"
    >
      <section-header
        on-accent
        :heading="t('welcome-view.pricing.heading')"
        :subtitle="t('welcome-view.pricing.subtitle')"
      />

      <plan-grid />

      <p
        data-testid="welcome-pricing__footnote"
        class="text-(--color-on-accent) text-center text-lg whitespace-normal xs:whitespace-pre-line *:[span]:bg-(--color-on-accent) *:[span]:text-(--color-accent) *:[span]:px-1 *:[span]:py-0.5 *:[span]:rounded-1.5 *:[span]:inline-block px-1"
        v-html="t('welcome-view.pricing.footnote')"
      ></p>
    </div>
  </section>
</template>
