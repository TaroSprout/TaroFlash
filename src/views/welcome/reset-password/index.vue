<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import ResetPasswordForm from './form.vue'
import { useResetPasswordActions } from '@/composables/auth/use-reset-password-actions'
import { useToast } from '@/composables/toast'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { emitSfx } from '@/sfx/bus'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const { password, confirm_password, loading, errors, submit } = useResetPasswordActions()

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))

async function onSubmit() {
  const result = await submit()
  if (result !== 'success') return

  emitSfx('success_1')
  toast.success(t('reset-password-modal.success-toast'))
  close()
  router.push({ name: 'authenticated' })
}
</script>

<template>
  <dialog-card
    data-testid="reset-password-modal-card"
    class="bg-brown-200 dark:bg-grey-800 gap-0!"
    size="sm"
    float_header
    data-theme="brown-50"
    data-theme-dark="stone-700"
    :title="t('reset-password-modal.heading')"
    @close="close()"
  >
    <reset-password-form
      v-model:password="password"
      v-model:confirm-password="confirm_password"
      :errors="errors"
      :loading="loading"
      @submit="onSubmit"
    />
  </dialog-card>
</template>
