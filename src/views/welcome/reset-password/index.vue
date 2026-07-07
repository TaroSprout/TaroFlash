<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import ResetPasswordForm from './form.vue'
import ResetPasswordSuccess from './success.vue'
import { useResetPasswordActions } from '@/composables/auth/use-reset-password-actions'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { emitSfx } from '@/sfx/bus'

const SUCCESS_DISPLAY_MS = 1400

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()
const router = useRouter()

const { password, confirm_password, loading, errors, success, submit } = useResetPasswordActions()

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))

async function onSubmit() {
  const result = await submit()
  if (result !== 'success') return

  emitSfx('success_1')
  await wait(SUCCESS_DISPLAY_MS)
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
    :show_header="!success"
    @close="close()"
  >
    <dialog-card-pager mode="out-in">
      <reset-password-form
        v-if="!success"
        key="form"
        v-model:password="password"
        v-model:confirm-password="confirm_password"
        :errors="errors"
        :loading="loading"
        @submit="onSubmit"
      />
      <reset-password-success v-else key="success" />
    </dialog-card-pager>
  </dialog-card>
</template>
