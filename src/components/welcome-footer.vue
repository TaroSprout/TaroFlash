<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiImage from '@/components/ui-kit/image.vue'
import UiButton from '@/components/ui-kit/button.vue'

type WelcomeFooterProps = {
  signup: (payment?: boolean) => void
}

const { signup } = defineProps<WelcomeFooterProps>()

const { t } = useI18n()
</script>

<template>
  <footer data-testid="welcome-footer" class="w-full bg-brown-300 dark:bg-grey-800">
    <div
      data-testid="welcome-footer__cta"
      class="relative w-full bg-blue-500 dark:bg-blue-650 wave-top-[30px] overflow-hidden px-7.5 pt-20 pb-28"
    >
      <div
        aria-hidden="true"
        class="absolute pointer-events-none inset-0 bg-(image:--bgx-stars) bg-center opacity-15"
      ></div>

      <div class="relative max-w-160 mx-auto flex flex-col items-center gap-6 text-center">
        <h2 class="text-5xl text-brown-100 font-bold">
          {{ t('welcome-view.footer-cta.heading') }}
        </h2>
        <p class="text-lg text-brown-100">{{ t('welcome-view.footer-cta.subheading') }}</p>

        <ui-button
          size="xl"
          data-theme="orange-700"
          icon-right="arrow-forward"
          class="outline-4! outline-brown-100!"
          :sfx="{ press: 'double_pop_up' }"
          @press="signup()"
        >
          {{ t('welcome-view.footer-cta.button') }}
        </ui-button>
      </div>
    </div>

    <div data-testid="welcome-footer__body" class="w-full px-7.5 py-16">
      <div class="max-w-(--page-width) mx-auto flex flex-col gap-10">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div data-testid="welcome-footer__brand" class="flex flex-col gap-4">
            <div class="flex items-center gap-2 text-brown-700 dark:text-brown-100">
              <ui-image src="logo" class="h-7" />
              <span class="text-xl font-bold">{{ t('app.title') }}</span>
            </div>
            <p class="text-base text-brown-700 dark:text-brown-100 max-w-75">
              {{ t('app.description') }}
            </p>
          </div>

          <nav data-testid="welcome-footer__resources" class="flex flex-col gap-3">
            <h3 class="text-base uppercase tracking-widest text-brown-700 dark:text-brown-100">
              {{ t('app.footer.resources') }}
            </h3>
            <a class="text-base text-brown-700 dark:text-brown-100" href="/privacy">
              {{ t('app.footer.privacy-policy') }}
            </a>
            <a class="text-base text-brown-700 dark:text-brown-100" href="/terms">
              {{ t('app.footer.terms-of-service') }}
            </a>
          </nav>
        </div>

        <div
          data-testid="welcome-footer__bottom"
          class="pt-6 border-t border-dashed border-brown-500 text-base text-brown-500"
        >
          {{ t('welcome-view.footer.copyright') }}
        </div>
      </div>
    </div>
  </footer>
</template>
