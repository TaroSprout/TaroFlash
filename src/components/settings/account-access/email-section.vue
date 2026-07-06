<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import SuccessPanel from './success-panel.vue'
import { useEmailActions } from './use-email-actions'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

defineProps<{ close: () => void }>()

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
    class="h-full flex flex-1 flex-col gap-2 py-4 pt-10"
  >
    <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
      <div v-if="!pending" key="form" class="flex flex-col items-center gap-6">
        <ui-icon src="mail-envelope" class="size-12" />
        <div class="w-full flex flex-col gap-2">
          <ui-input
            data-theme="brown-50"
            data-theme-dark="stone-700"
            :value="current_email"
            type="email"
            size="lg"
            disabled
            data-testid="account-access-modal__email-current-input"
          />
          <ui-input
            data-theme="brown-50"
            data-theme-dark="stone-700"
            :placeholder="t('account-access-modal.email.new-label')"
            v-model:value="email"
            type="email"
            size="lg"
            :error="error"
            data-testid="account-access-modal__email-input"
          />
          <ui-button
            data-testid="account-access-modal__email-submit"
            data-theme="blue-500"
            data-theme-dark="blue-650"
            size="lg"
            full-width
            :loading="loading"
            @press="submit"
          >
            {{ t('account-access-modal.email.submit-button') }}
          </ui-button>
        </div>
      </div>

      <success-panel
        v-else
        key="pending"
        data-testid="account-access-modal__email-pending"
        icon="send"
        :heading="t('account-access-modal.email.pending-heading')"
        :message="t('account-access-modal.email.pending-message')"
        :close="close"
      />
    </transition>
  </div>
</template>
