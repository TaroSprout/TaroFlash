import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { isoNow } from '@/utils/date'
import { uploadImage, insertMedia } from '@/api/media/db'
import { useMemberStore } from '@/stores/member'
import { hashFile } from '@/utils/hash'
import { buildCardPayload } from '@/utils/card/payload'
import { type CardBase } from '@type/card'

/**
 * Upserts a card with `values` merged over the current state. Leaves `card`
 * untouched — optimistic apply and rollback are the caller's concern.
 * Caller-side debouncing lives in the `useSaveCardMutation` wrapper, and the
 * no-change short-circuit lives in the composable that calls it (both must
 * happen before any optimistic mutation is applied to `card`).
 */
export async function saveCard(card: Card, values: Partial<Card>): Promise<void> {
  if (!card.id) return
  await upsertCard(buildCardPayload({ ...card, ...values }))
}

export async function upsertCard(card: Partial<CardBase>): Promise<Card> {
  const sanitized = {
    ...card,
    updated_at: isoNow()
  }

  const { data, error } = await supabase
    .from('cards')
    .upsert(sanitized, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data
}

export async function upsertCards(cards: Partial<CardBase>[]): Promise<Card[]> {
  const sanitized = cards.map((card) => ({
    ...card,
    updated_at: isoNow()
  }))

  const { data, error } = await supabase
    .from('cards')
    .upsert(sanitized, { onConflict: 'id' })
    .select()

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data
}

export async function setCardImage(card_id: number, file: File, side: 'front' | 'back') {
  const member_id = useMemberStore().id
  if (!member_id) throw new Error('Not authenticated')

  const bucket = 'member-images'
  const slot = `card_${side}` as const
  // Content-addressed path: hashing the bytes means the same image reused
  // across cards (or as a deck bg) collapses to one storage object. member_id
  // stays the first segment — it scopes dedup per-member and satisfies the
  // storage RLS foldername check. Which card/side uses the image lives in
  // `media` (card_id + slot), not in the path.
  const path = `${member_id}/${await hashFile(file)}.${file.type.split('/')[1]}`

  // Upload first so we don't soft-delete the previous image (via the DB
  // trigger on insertMedia) until the new file is actually in storage.
  // Failure mode: upload fails → nothing changed.
  //                insertMedia fails → storage file is orphaned, reaped by
  //                cleanup-media cron.
  await uploadImage(bucket, path, file)
  await insertMedia({ bucket, path, card_id, slot })
}
