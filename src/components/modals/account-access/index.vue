<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import UiButton from '@/components/ui-kit/button.vue'
import AccountAccessMenu, { type AccountAccessPage } from './account-access-menu.vue'
import EmailSection from './email-section.vue'
import PasswordSection from './password-section.vue'
import { useSessionStore } from '@/stores/session'
import { emitSfx } from '@/sfx/bus'
import { fadeLeave } from '@/utils/animations/fade'
import { springScaleIn } from '@/utils/animations/modal'

defineProps<{ close: () => void }>()

const { t } = useI18n()
const session = useSessionStore()

type Page = 'menu' | AccountAccessPage
const page = ref<Page>('menu')

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

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))
</script>

<template>
  <dialog-card
    data-testid="account-access-modal"
    class="size-140 bg-brown-200 py-6 dark:bg-grey-800"
    data-theme="brown-50"
    data-theme-dark="stone-700"
    :title="title"
    @close="close()"
  >
    <div data-testid="account-access-modal__body" class="flex flex-col gap-8 px-(--dialog-px)">
      <p
        v-if="page === 'menu'"
        data-testid="account-access-modal__description"
        class="text-center text-brown-500 dark:text-brown-300"
      >
        {{ t('account-access-modal.description') }}
      </p>

      <div class="flex flex-col gap-4">
        <ui-button
          v-if="page !== 'menu'"
          data-testid="account-access-modal__back"
          icon-left="arrow-back"
          size="sm"
          class="self-start"
          @press="page = 'menu'"
        >
          {{ t('account-access-modal.back-label') }}
        </ui-button>

        <transition :css="false" mode="out-in" @leave="onLeave" @enter="onEnter">
          <account-access-menu v-if="page === 'menu'" key="menu" @navigate="(p) => (page = p)" />
          <email-section v-else-if="page === 'email'" key="email" />
          <password-section v-else key="password" />
        </transition>
      </div>
    </div>
  </dialog-card>
</template>
