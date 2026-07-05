<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AccountAccessMenu, { type AccountAccessPage } from './account-access-menu.vue'
import EmailSection from './email-section.vue'
import PasswordSection from './password-section.vue'
import { useSessionStore } from '@/stores/session'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

export type AccountAccessContentPage = 'menu' | AccountAccessPage

const { t } = useI18n()
const session = useSessionStore()

const page = defineModel<AccountAccessContentPage>('page', { default: 'menu' })

const title = computed(() => {
  if (page.value === 'menu') return t('account-access-modal.title')
  if (page.value === 'email') return t('account-access-modal.email.heading')
  return session.hasPasswordIdentity
    ? t('account-access-modal.password.heading-change')
    : t('account-access-modal.password.heading-set')
})

function onLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  springScaleIn(el, done)
}

defineExpose({ title })
</script>

<template>
  <div data-testid="account-access-content" class="flex flex-1 flex-col items-center">
    <p
      v-if="page === 'menu'"
      data-testid="account-access-modal__description"
      class="text-center text-brown-500 dark:text-brown-300"
    >
      {{ t('account-access-modal.description') }}
    </p>

    <div class="w-full max-w-100 flex flex-1 flex-col gap-4">
      <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
        <account-access-menu v-if="page === 'menu'" key="menu" @navigate="(p) => (page = p)" />
        <email-section v-else-if="page === 'email'" key="email" />
        <password-section v-else key="password" />
      </transition>
    </div>
  </div>
</template>
