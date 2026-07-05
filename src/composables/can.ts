import { computed } from 'vue'
import { useMemberStore } from '@/stores/member'
import { useMemberDeckCountQuery } from '@/api/decks'
import { usePlanLimits } from '@/composables/plan-limits'

/**
 * Capability checks for the current member.
 *
 * Every capability is a ComputedRef so templates and computeds downstream
 * re-evaluate automatically when member/plan/deck-count state changes.
 *
 * Name capabilities by the feature, not by the role that currently has access.
 *
 *   Bad:  `can.administrate`  — implies "because they're an admin"
 *   Good: `can.manageUsers`   — implies "because they need to manage users"
 *
 * When a policy changes (e.g. paid users should now export analytics), edit
 * the single line in this file — every call site picks up the new behavior
 * automatically.
 *
 * @example
 * const can = useCan()
 * if (!can.createDeck.value) { ... }
 */
export function useCan() {
  const member = useMemberStore()
  const deckCount = useMemberDeckCountQuery()
  const { deckLimit, cardsPerDeckLimit } = usePlanLimits()

  const useProFeature = computed(() => member.plan === 'paid')

  const createDeck = computed(() => {
    const limit = deckLimit.value
    const count = deckCount.data.value ?? 0
    return limit === null || count < limit
  })

  const useCardImages = computed(() => member.plan === 'paid')

  // Admin-only for now (the audio reader is unreleased). Re-enforced server-side
  // in the transcribe-audio / translate-term edge functions — this gate is UX.
  const useAudioReader = computed(() => member.role === 'admin')

  /**
   * True when a deck currently at `count` cards has room for `adding` more
   * under the member's plan cap. Takes params (not a ComputedRef) since the
   * cap is evaluated per-deck, against a live count the caller supplies.
   */
  function addCards(count: number, adding = 1): boolean {
    const limit = cardsPerDeckLimit.value
    return limit === null || count + adding <= limit
  }

  return { useProFeature, createDeck, useCardImages, useAudioReader, addCards }
}
