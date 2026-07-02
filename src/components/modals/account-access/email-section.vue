<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useEmailActions } from './use-email-actions'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

const { t } = useI18n()
const { email, loading, error, pending, submit } = useEmailActions()

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}
</script>

<template>
  <div data-testid="account-access-modal__email-section" class="flex flex-col gap-2">
    <span class="flex items-center gap-2 text-brown-700 dark:text-brown-100">
      <ui-icon src="mail-envelope" class="size-5" />
      {{ t('account-access-modal.email.heading') }}
    </span>

    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div v-if="!pending" key="form" class="flex items-start gap-2">
        <ui-input
          v-model="email"
          type="email"
          size="sm"
          :error="error"
          class="flex-1"
          data-testid="account-access-modal__email-input"
        />
        <ui-button
          data-testid="account-access-modal__email-submit"
          data-theme="blue-500"
          size="sm"
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
