<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import SuccessPanel from './success-panel.vue'
import { usePasswordActions } from './use-password-actions'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

defineProps<{ close: () => void }>()

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
  <div
    data-testid="account-access-modal__password-section"
    class="h-full flex flex-1 flex-col gap-2 py-4 pt-10"
  >
    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div v-if="!success" key="form" class="flex flex-col items-center gap-6">
        <ui-icon src="keyhole" class="size-12 text-brown-700 dark:text-brown-100" />
        <div class="w-full flex flex-col gap-2">
          <ui-input
            data-theme="brown-50"
            data-theme-dark="stone-700"
            v-model:value="password"
            type="password"
            autocomplete="new-password"
            size="lg"
            :error="errors.password"
            :placeholder="t('account-access-modal.password.new-placeholder')"
            data-testid="account-access-modal__password-input"
          />
          <ui-input
            data-theme="brown-50"
            data-theme-dark="stone-700"
            v-model:value="confirm_password"
            type="password"
            autocomplete="new-password"
            size="lg"
            :error="errors.confirm_password"
            :placeholder="t('account-access-modal.password.confirm-placeholder')"
            data-testid="account-access-modal__password-confirm-input"
          />
          <ui-button
            data-testid="account-access-modal__password-submit"
            data-theme="blue-500"
            data-theme-dark="blue-650"
            size="lg"
            full-width
            :loading="loading"
            @press="submit"
          >
            {{ t('account-access-modal.password.submit-button') }}
          </ui-button>
        </div>
      </div>

      <success-panel
        v-else
        key="success"
        data-testid="account-access-modal__password-success"
        icon="party-popper"
        :heading="t('account-access-modal.password.success-heading')"
        :message="t('account-access-modal.password.success-message')"
        :close="close"
      />
    </transition>
  </div>
</template>
