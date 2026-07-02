<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import EmailSection from './email-section.vue'
import PasswordSection from './password-section.vue'
import GoogleSection from './google-section.vue'
import { emitSfx } from '@/sfx/bus'

defineProps<{ close: () => void }>()

const { t } = useI18n()

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))
</script>

<template>
  <dialog-card
    data-testid="account-access-modal"
    class="w-120 bg-brown-100 py-6 dark:bg-grey-800"
    data-theme="brown-300"
    data-theme-dark="stone-700"
    :title="t('account-access-modal.title')"
    @close="close()"
  >
    <div data-testid="account-access-modal__body" class="flex flex-col gap-6 px-(--dialog-px)">
      <email-section />
      <password-section />
      <google-section />
    </div>
  </dialog-card>
</template>
