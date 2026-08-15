import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUpdateFeedbackItemMutation } from '@/api/feedback'
import { useNoticeStore } from '@/stores/notice-store'

export const STATUS_ORDER: FeedbackStatus[] = ['new', 'accepted', 'rejected', 'in-progress', 'done']

/**
 * One admin feedback row's published toggle and status picker, each committed
 * the instant it changes rather than through a save step. The two controls
 * hold their own optimistic value because `update_feedback_item` sets status
 * and visibility together — flipping one has to resend the other's current
 * value, and a rejected write has to snap that one control back without
 * disturbing the other.
 */
export function useFeedbackRow(item: Ref<FeedbackItem>) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const updateItem = useUpdateFeedbackItemMutation()

  const published = ref(item.value.visibility === 'public')
  const status = ref(item.value.status)

  watch(
    () => item.value.visibility,
    (visibility) => (published.value = visibility === 'public')
  )
  watch(
    () => item.value.status,
    (next) => (status.value = next)
  )

  const status_options = computed(() =>
    STATUS_ORDER.map((value) => ({ value, label: t(`admin.feedback-page.status.${value}`) }))
  )

  async function onPublishedChange(next: boolean) {
    const previous = published.value
    published.value = next
    await commit(status.value, next ? 'public' : 'internal', () => (published.value = previous))
  }

  async function onStatusChange(next: FeedbackStatus) {
    const previous = status.value
    status.value = next
    await commit(next, published.value ? 'public' : 'internal', () => (status.value = previous))
  }

  async function commit(
    next_status: FeedbackStatus,
    next_visibility: FeedbackVisibility,
    revert: () => void
  ) {
    try {
      await updateItem.mutateAsync({
        feedback_id: item.value.id,
        status: next_status,
        visibility: next_visibility
      })
    } catch {
      revert()
      notice.error(t('toast.error.admin-feedback-update-failed'))
    }
  }

  return { published, status, status_options, onPublishedChange, onStatusChange }
}
