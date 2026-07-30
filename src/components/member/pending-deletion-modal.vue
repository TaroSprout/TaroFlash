<script setup lang="ts">
// Shown over the welcome page while an account is pending deletion. Sign-in is
// deliberately not blocked — restoring needs a live session, so the router lets
// the member in and diverts them here instead of the dashboard.
//
// Non-dismissable (`useModalRequestClose` with a no-op swallows backdrop clicks
// and esc, and the header's close button is hidden): while suspended, every
// member-owned query resolves empty, so closing this would leave them signed in
// on the marketing page with no route back to the restore action.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQueryCache } from '@pinia/colada'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { restoreAccount } from '@/api/session'
import { useMemberStore } from '@/stores/member'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore } from '@/stores/notice-store'
import { useModalRequestClose } from '@/composables/modal'
import logger from '@/utils/logger'

type PendingDeletionModalProps = {
  close: () => void
}

const { close } = defineProps<PendingDeletionModalProps>()

const { t, locale } = useI18n()
const router = useRouter()
const member = useMemberStore()
const session = useSessionStore()
const notice = useNoticeStore()
const queryCache = useQueryCache()

useModalRequestClose(() => {})

const restoring = ref(false)

const restore_by = computed(() => {
  if (!member.delete_at) return ''

  return new Date(member.delete_at).toLocaleDateString(locale.value, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
})

async function onRestore() {
  restoring.value = true

  try {
    await restoreAccount()
  } catch (e) {
    logger.error(`Restore failed: ${(e as Error).message}`)
    notice.error(t('toast.error.account-restore-failed'))
    return
  } finally {
    restoring.value = false
  }

  // While suspended, every member-owned query resolved to an empty result and
  // cached it. Those entries are all wrong now, so drop the cache wholesale the
  // same way a fresh login does — no per-key invalidation is worth enumerating
  // when the answer is "everything the member owns just came back". The router
  // guard re-reads the member row on the push below and sees a live account.
  queryCache.getEntries().forEach((entry) => queryCache.remove(entry))

  notice.success(t('toast.success.account-restored'))
  close()
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <dialog-card
    data-testid="pending-deletion-modal"
    size="sm"
    data-palette="red"
    :title="t('pending-deletion-modal.heading')"
    :show_close_button="false"
  >
    <dialog-card-body data-testid="pending-deletion-modal__scroll-area">
      <p
        data-testid="pending-deletion-modal__message"
        class="text-ink pt-4 text-base leading-relaxed"
      >
        {{ t('pending-deletion-modal.message', { date: restore_by }) }}
      </p>
    </dialog-card-body>

    <template #toolbar>
      <div data-testid="pending-deletion-modal__actions" class="flex flex-col gap-2.5">
        <ui-button
          data-testid="pending-deletion-modal__restore"
          data-palette="brand"
          full-width
          size="lg"
          :loading="restoring"
          :sfx="{ press: 'music_plink_ok' }"
          @press="onRestore"
        >
          {{ t('pending-deletion-modal.restore-button') }}
        </ui-button>

        <ui-button
          data-testid="pending-deletion-modal__sign-out"
          neutral
          full-width
          size="lg"
          :fancy-hover="false"
          @press="session.logout()"
        >
          {{ t('pending-deletion-modal.sign-out-button') }}
        </ui-button>
      </div>
    </template>
  </dialog-card>
</template>
