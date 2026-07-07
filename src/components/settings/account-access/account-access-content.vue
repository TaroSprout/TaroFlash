<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AccountAccessMenu, { type AccountAccessPage } from './account-access-menu.vue'
import EmailSection from './email-section.vue'
import PasswordSection from './password-section.vue'
import SuccessPanel from './success-panel.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import { useSessionStore } from '@/stores/session'

export type AccountAccessContentPage =
  | 'menu'
  | AccountAccessPage
  | 'email-success'
  | 'password-success'

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
  if (page.value === 'email' || page.value === 'email-success')
    return t('account-access-modal.email.heading')
  return session.hasPasswordIdentity
    ? t('account-access-modal.password.heading-change')
    : t('account-access-modal.password.heading-set')
})

defineExpose({ title })
</script>

<template>
  <div data-testid="account-access-content" class="relative w-full h-full">
    <dialog-card-pager>
      <account-access-menu
        v-if="page === 'menu'"
        key="menu"
        class="absolute inset-0"
        @navigate="(p) => (page = p)"
      />

      <email-section
        v-else-if="page === 'email'"
        key="email"
        class="absolute inset-0"
        @pending="page = 'email-success'"
      />

      <success-panel
        v-else-if="page === 'email-success'"
        key="email-success"
        data-testid="account-access-modal__email-pending"
        class="absolute inset-0 pt-8"
        icon="send"
        :heading="t('account-access-modal.email.pending-heading')"
        :message="t('account-access-modal.email.pending-message')"
        :close="onSuccessClose"
      />

      <password-section
        v-else-if="page === 'password'"
        key="password"
        class="absolute inset-0"
        @success="page = 'password-success'"
      />

      <success-panel
        v-else
        key="password-success"
        data-testid="account-access-modal__password-success"
        class="absolute inset-0 pt-8"
        icon="party-popper"
        :heading="t('account-access-modal.password.success-heading')"
        :message="t('account-access-modal.password.success-message')"
        :close="onSuccessClose"
      />
    </dialog-card-pager>
  </div>
</template>
