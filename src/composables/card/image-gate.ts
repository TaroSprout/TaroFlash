import { useI18n } from 'vue-i18n'
import Checkout from '@/components/modals/checkout/index.vue'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { useCan } from '@/composables/can'

/**
 * Gate for the paid-only card-image feature. Mirrors
 * `useDeckActions.guardCreateDeck`: the FE check is UX only — the real boundary
 * is the `media` INSERT RLS policy. Free members get an upgrade alert that opens
 * the subscription Checkout modal on confirm.
 *
 * @example
 * const { guardCardImage } = useCardImageGate()
 * if (!(await guardCardImage())) return
 */
export function useCardImageGate() {
  const { t } = useI18n()
  const alert = useAlert()
  const modal = useModal()
  const can = useCan()

  /**
   * Resolve `true` when the current member may upload card images. For a free
   * member, shows the upgrade alert (opening Checkout on confirm) and resolves
   * `false` — the caller should abort the upload.
   */
  async function guardCardImage(): Promise<boolean> {
    if (can.useCardImages.value) return true

    const confirmed = await alert.warn({
      title: t('errors.card-images-paid.title'),
      message: t('errors.card-images-paid.message'),
      confirmLabel: t('errors.card-images-paid.upgrade-cta')
    }).response

    if (confirmed) modal.open(Checkout, { mode: 'mobile-sheet', backdrop: true })
    return false
  }

  return { guardCardImage }
}
