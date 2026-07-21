<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="p-8 w-full max-w-(--page-width) mx-auto text-ink flex flex-col gap-8">
    <div>
      <h1 class="text-5xl">{{ t('terms-of-service.title') }}</h1>
      <p class="text-lg leading-relaxed">{{ t('terms-of-service.intro') }}</p>
    </div>

    <!-- Section 1: Use of the Service -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-1.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-1.content') }}</p>
    </section>

    <!-- Section 2: Accounts -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-2.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-2.content') }}</p>
    </section>

    <!-- Section 3: User Content -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-3.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-3.content-1') }}</p>
      <p class="leading-relaxed">{{ t('terms-of-service.section-3.content-2') }}</p>
    </section>

    <!-- Section 4: Payments -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-4.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-4.content') }}</p>
    </section>

    <!-- Section 5: Service Availability -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-5.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-5.content') }}</p>
    </section>

    <!-- Section 6: Termination -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-6.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-6.content') }}</p>
    </section>

    <!-- Section 7: Changes to These Terms -->
    <section>
      <h2 class="text-3xl">{{ t('terms-of-service.section-7.title') }}</h2>
      <p class="leading-relaxed">{{ t('terms-of-service.section-7.content') }}</p>
    </section>
  </div>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
