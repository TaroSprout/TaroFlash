<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import ForgotPasswordForm from './form.vue'
import ForgotPasswordSuccess from './success.vue'
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
    class="gap-0!"
    size="sm"
    float_header
    :title="t('forgot-password-modal.heading')"
    @close="close()"
  >
    <div class="relative w-full h-full">
      <dialog-card-pager>
        <forgot-password-form
          v-if="!auth.success"
          key="form"
          class="absolute inset-0 pt-6"
          v-model:email="auth.email"
          :errors="auth.errors"
          :loading="auth.loading"
          :all-filled="auth.all_filled"
          :submit-error="auth.submitError"
          @submit="onSubmit"
        />
        <forgot-password-success
          v-else
          key="success"
          class="absolute inset-0 pt-8"
          :close="close"
        />
      </dialog-card-pager>
    </div>
  </dialog-card>
</template>
