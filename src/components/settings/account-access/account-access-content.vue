<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AccountAccessMenu, { type AccountAccessPage } from './account-access-menu.vue'
import EmailSection from './email-section.vue'
import PasswordSection from './password-section.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import { useSessionStore } from '@/stores/session'

export type AccountAccessContentPage = 'menu' | AccountAccessPage

const props = defineProps<{ close?: () => void }>()

const { t } = useI18n()
const session = useSessionStore()

const page = defineModel<AccountAccessContentPage>('page', { default: 'menu' })

// Standalone tab context has no modal to close — fall back to returning to the menu.
function onSuccessClose() {
  if (props.close) props.close()
  else page.value = 'menu'
}

const title = computed(() => {
  if (page.value === 'menu') return t('account-access-modal.title')
  if (page.value === 'email') return t('account-access-modal.email.heading')
  return session.hasPasswordIdentity
    ? t('account-access-modal.password.heading-change')
    : t('account-access-modal.password.heading-set')
})

defineExpose({ title })
</script>

<template>
  <div data-testid="account-access-content" class="flex flex-1 flex-col items-center">
    <div class="w-full max-w-100 flex flex-1 flex-col gap-4">
      <dialog-card-pager mode="out-in">
        <account-access-menu v-if="page === 'menu'" key="menu" @navigate="(p) => (page = p)" />
        <email-section v-else-if="page === 'email'" key="email" :close="onSuccessClose" />
        <password-section v-else key="password" :close="onSuccessClose" />
      </dialog-card-pager>
    </div>
  </div>
</template>
