<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { usePasswordActions } from './use-password-actions'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

const { t } = useI18n()
const { password, confirm_password, loading, errors, success, submit } = usePasswordActions()

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}
</script>

<template>
  <div data-testid="account-access-modal__password-section" class="flex flex-col gap-2">
    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div v-if="!success" key="form" class="flex items-start gap-2">
        <ui-input
          v-model="password"
          type="password"
          autocomplete="new-password"
          size="sm"
          :error="errors.password"
          :placeholder="t('account-access-modal.password.new-placeholder')"
          class="flex-1"
          data-testid="account-access-modal__password-input"
        />
        <ui-input
          v-model="confirm_password"
          type="password"
          autocomplete="new-password"
          size="sm"
          :error="errors.confirm_password"
          :placeholder="t('account-access-modal.password.confirm-placeholder')"
          class="flex-1"
          data-testid="account-access-modal__password-confirm-input"
        />
        <ui-button
          data-testid="account-access-modal__password-submit"
          data-theme="blue-500"
          size="sm"
          :loading="loading"
          @press="submit"
        >
          {{ t('account-access-modal.password.submit-button') }}
        </ui-button>
      </div>

      <p
        v-else
        key="success"
        data-testid="account-access-modal__password-success"
        class="text-brown-400 dark:text-brown-300"
      >
        {{ t('account-access-modal.password.success-message') }}
      </p>
    </transition>
  </div>
</template>
