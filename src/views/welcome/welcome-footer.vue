<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div data-testid="welcome-footer" data-station="panel" class="w-full bg-surface">
    <div class="w-full bg-(--color-accent) text-(--color-on-accent) wave-top-[30px] py-20">
      <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-10">
        <div class="grid grid-cols-2 gap-10">
          <div class="flex flex-col gap-5">
            <h2 class="text-4xl">{{ t('app.footer.about') }}</h2>
            <p>
              {{ t('app.footer.description') }}
            </p>
          </div>

          <div class="flex flex-col gap-5">
            <h2 class="text-4xl">{{ t('app.footer.resources') }}</h2>
            <a href="/privacy">{{ t('app.footer.privacy-policy') }}</a>
            <a href="/terms">{{ t('app.footer.terms-of-service') }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
