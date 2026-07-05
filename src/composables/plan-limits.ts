import { computed } from 'vue'
import { useMemberStore } from '@/stores/member'
import { usePlanLimitsQuery } from '@/api/plans'

/**
 * The current member's plan-gated numeric limits (deck count, cards per
 * deck). Sourced from the `plans` table — the backend is the single source
 * of truth for these, not a hardcoded value in `src/config/plans.ts`.
 */
export function usePlanLimits() {
  const member = useMemberStore()
  const { data } = usePlanLimitsQuery()

  const current = computed(() => data.value?.find((plan) => plan.id === (member.plan ?? 'free')))

  const deckLimit = computed(() => current.value?.deck_limit ?? null)
  const cardsPerDeckLimit = computed(() => current.value?.cards_per_deck_limit ?? null)

  return { deckLimit, cardsPerDeckLimit }
}
