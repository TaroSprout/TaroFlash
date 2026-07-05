<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="w-full bg-brown-200 dark:bg-grey-800">
    <div class="w-full bg-blue-500 dark:bg-blue-650 wave-top-[30px] py-20">
      <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-10">
        <div class="grid grid-cols-2 gap-10">
          <div class="flex flex-col gap-5">
            <h2 class="text-4xl text-brown-100">{{ t('app.footer.about') }}</h2>
            <p class="text-brown-100">
              {{ t('app.footer.description') }}
            </p>
          </div>

          <div class="flex flex-col gap-5">
            <h2 class="text-4xl text-brown-100">{{ t('app.footer.resources') }}</h2>
            <a class="text-brown-100" href="/privacy">{{ t('app.footer.privacy-policy') }}</a>
            <a class="text-brown-100" href="/terms">{{ t('app.footer.terms-of-service') }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
