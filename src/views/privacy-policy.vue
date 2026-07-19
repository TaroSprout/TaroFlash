<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div
    class="p-8 w-full max-w-(--page-width) mx-auto text-brown-700 dark:text-brown-100 flex flex-col gap-8"
  >
    <div>
      <h1 class="text-5xl">{{ t('privacy-policy.title') }}</h1>
      <p class="text-lg leading-relaxed">{{ t('privacy-policy.intro') }}</p>
    </div>

    <!-- Section 1: Information We Collect -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-1.title') }}</h2>

      <!-- Account Information -->
      <div>
        <h3 class="text-2xl">
          {{ t('privacy-policy.section-1.subsection-1.title') }}
        </h3>
        <p class="leading-relaxed">
          {{ t('privacy-policy.section-1.subsection-1.content') }}
        </p>
        <ul class="list-disc list-inside ml-4 space-y-1">
          <li>{{ t('privacy-policy.section-1.subsection-1.item-1') }}</li>
          <li>{{ t('privacy-policy.section-1.subsection-1.item-2') }}</li>
          <li>{{ t('privacy-policy.section-1.subsection-1.item-3') }}</li>
        </ul>
        <p class="leading-relaxed">{{ t('privacy-policy.section-1.subsection-1.footer') }}</p>
      </div>

      <!-- Google Sign-In Data -->
      <div>
        <h3 class="text-2xl">
          {{ t('privacy-policy.section-1.subsection-2.title') }}
        </h3>
        <p class="leading-relaxed">
          {{ t('privacy-policy.section-1.subsection-2.content') }}
        </p>
        <ul class="list-disc list-inside ml-4 space-y-1">
          <li>{{ t('privacy-policy.section-1.subsection-2.item-1') }}</li>
          <li>{{ t('privacy-policy.section-1.subsection-2.item-2') }}</li>
        </ul>
        <p class="leading-relaxed">{{ t('privacy-policy.section-1.subsection-2.footer') }}</p>
      </div>
    </section>

    <!-- Section 2: How We Use Your Information -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-2.title') }}</h2>
      <p class="leading-relaxed">{{ t('privacy-policy.section-2.content') }}</p>
      <ul class="list-disc list-inside ml-4 space-y-1">
        <li>{{ t('privacy-policy.section-2.item-1') }}</li>
        <li>{{ t('privacy-policy.section-2.item-2') }}</li>
        <li>{{ t('privacy-policy.section-2.item-3') }}</li>
        <li>{{ t('privacy-policy.section-2.item-4') }}</li>
      </ul>
      <p class="leading-relaxed">{{ t('privacy-policy.section-2.footer') }}</p>
    </section>

    <!-- Section 3: Data Storage and Security -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-3.title') }}</h2>
      <ul class="list-disc list-inside ml-4 space-y-2">
        <li>{{ t('privacy-policy.section-3.item-1') }}</li>
        <li>{{ t('privacy-policy.section-3.item-2') }}</li>
        <li>{{ t('privacy-policy.section-3.item-3') }}</li>
        <li>{{ t('privacy-policy.section-3.item-4') }}</li>
        <li>{{ t('privacy-policy.section-3.item-5') }}</li>
      </ul>
    </section>

    <!-- Section 4: Data Sharing -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-4.title') }}</h2>
      <p class="leading-relaxed">{{ t('privacy-policy.section-4.content-1') }}</p>
      <p class="leading-relaxed">{{ t('privacy-policy.section-4.content-2') }}</p>
      <ul class="list-disc list-inside ml-4 space-y-1">
        <li>{{ t('privacy-policy.section-4.item-1') }}</li>
        <li>{{ t('privacy-policy.section-4.item-2') }}</li>
      </ul>
      <p class="leading-relaxed">{{ t('privacy-policy.section-4.footer') }}</p>
    </section>

    <!-- Section 5: Future Social Features -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-5.title') }}</h2>
      <p class="leading-relaxed">{{ t('privacy-policy.section-5.content') }}</p>
    </section>

    <!-- Section 6: Data Deletion -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-6.title') }}</h2>
      <p class="leading-relaxed">{{ t('privacy-policy.section-6.content') }}</p>
    </section>

    <!-- Section 7: Changes to This Policy -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-7.title') }}</h2>
      <p class="leading-relaxed">{{ t('privacy-policy.section-7.content') }}</p>
    </section>

    <!-- Section 8: Contact -->
    <section>
      <h2 class="text-3xl">{{ t('privacy-policy.section-8.title') }}</h2>
      <p class="leading-relaxed">{{ t('privacy-policy.section-8.content') }}</p>
      <a
        href="mailto:support@taro-flash.com"
        class="text-blue-500 hover:text-blue-650 dark:text-blue-400 dark:hover:text-blue-400 underline"
      >
        {{ t('privacy-policy.section-8.email') }}
      </a>
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
