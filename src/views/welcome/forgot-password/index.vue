<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import ForgotPasswordForm from './form.vue'
import { useForgotPasswordActions } from '@/composables/auth/use-forgot-password-actions'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

const auth = useForgotPasswordActions()

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))

async function onSubmit() {
  await auth.submit()
}
</script>

<template>
  <dialog-card
    data-testid="forgot-password-modal-card"
    class="w-140 h-110 bg-brown-200 dark:bg-grey-800 gap-0!"
    data-theme="brown-50"
    data-theme-dark="stone-700"
    :title="t('forgot-password-modal.heading')"
    @close="close()"
  >
    <forgot-password-form
      v-model:email="auth.email"
      :errors="auth.errors"
      :loading="auth.loading"
      :all-filled="auth.all_filled"
      :submit-error="auth.submitError"
      :success="auth.success"
      :close="close"
      @submit="onSubmit"
    />
  </dialog-card>
</template>
