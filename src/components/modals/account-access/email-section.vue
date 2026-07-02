<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useEmailActions } from './use-email-actions'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

const { t } = useI18n()
const { current_email, email, loading, error, pending, submit } = useEmailActions()

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}
</script>

<template>
  <div
    data-testid="account-access-modal__email-section"
    class="flex flex-1 flex-col justify-center gap-2"
  >
    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div v-if="!pending" key="form" class="flex flex-col gap-4">
        <ui-input
          :label="t('account-access-modal.email.current-label')"
          v-model="current_email"
          type="email"
          size="lg"
          disabled
          data-testid="account-access-modal__email-current-input"
        />
        <ui-input
          :label="t('account-access-modal.email.new-label')"
          v-model="email"
          type="email"
          size="lg"
          :error="error"
          data-testid="account-access-modal__email-input"
        />
        <ui-button
          data-testid="account-access-modal__email-submit"
          data-theme="blue-500"
          size="lg"
          full-width
          :loading="loading"
          @press="submit"
        >
          {{ t('account-access-modal.email.submit-button') }}
        </ui-button>
      </div>

      <p
        v-else
        key="pending"
        data-testid="account-access-modal__email-pending"
        class="text-brown-400 dark:text-brown-300"
      >
        {{ t('account-access-modal.email.pending-message') }}
      </p>
    </transition>
  </div>
</template>
