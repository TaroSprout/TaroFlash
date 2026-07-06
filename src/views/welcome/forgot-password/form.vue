<script setup lang="ts">
import { toRef, watch } from 'vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useI18n } from 'vue-i18n'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'
import { emitSfx } from '@/sfx/bus'
import type { ForgotPasswordFieldErrors } from '@/composables/auth/use-forgot-password-actions'

type ForgotPasswordFormProps = {
  errors?: ForgotPasswordFieldErrors
  loading?: boolean
  allFilled?: boolean
  submitError?: string
  success?: boolean
  close: () => void
}

const {
  errors = {},
  loading = false,
  allFilled = false,
  submitError = '',
  success = false,
  close
} = defineProps<ForgotPasswordFormProps>()

const email = defineModel<string>('email', { required: true })

const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}

watch(
  toRef(() => success),
  (isSuccess) => {
    if (isSuccess) emitSfx('success_1')
  }
)
</script>

<template>
  <div
    data-testid="forgot-password-modal"
    class="w-full max-w-100 h-full flex flex-1 flex-col items-center gap-2 py-4 pt-10 mx-auto"
  >
    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div v-if="!success" key="form" class="w-full flex flex-1 flex-col items-center gap-2">
        <div class="w-full flex flex-col gap-2">
          <p class="text-base text-brown-500 dark:text-brown-300 text-center">
            {{ t('forgot-password-modal.instructions') }}
          </p>

          <form class="contents" @submit.prevent="emit('submit')">
            <ui-input
              type="email"
              name="email"
              data-theme="brown-50"
              data-theme-dark="stone-700"
              autocomplete="username"
              size="lg"
              v-model="email"
              :error="errors.email"
              :placeholder="t('forgot-password-modal.email-placeholder')"
              data-testid="forgot-password-modal__email-input"
            />
            <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
          </form>

          <p
            v-if="submitError"
            data-testid="forgot-password-modal__error"
            class="text-base text-red-500 dark:text-red-400 text-center"
          >
            {{ submitError }}
          </p>

          <ui-button
            data-testid="forgot-password-modal__submit"
            data-theme="blue-500"
            data-theme-dark="blue-650"
            size="lg"
            full-width
            :loading="loading"
            :disabled="!allFilled"
            click-when-disabled
            @press="emit('submit')"
          >
            {{ t('forgot-password-modal.submit-button') }}
          </ui-button>
        </div>
      </div>

      <div
        v-else
        key="success"
        data-testid="forgot-password-modal__success"
        class="h-full min-h-75 max-h-80 flex flex-col items-center justify-between pt-4 pb-6 text-center"
      >
        <ui-icon src="mail-envelope" class="size-12 text-brown-700 dark:text-brown-100" />

        <div class="flex flex-col gap-2">
          <p class="text-xl text-brown-700 dark:text-brown-100">
            {{ t('forgot-password-modal.success-heading') }}
          </p>
          <p class="text-brown-500 dark:text-brown-300">
            {{ t('forgot-password-modal.success-message') }}
          </p>
        </div>

        <ui-button
          data-testid="forgot-password-modal__success-close"
          data-theme="brown-50"
          data-theme-dark="stone-700"
          size="xl"
          full-width
          :sfx="{ press: 'snappy_button_5' }"
          @press="close"
        >
          {{ t('dialog-card.close-label') }}
        </ui-button>
      </div>
    </transition>
  </div>
</template>
