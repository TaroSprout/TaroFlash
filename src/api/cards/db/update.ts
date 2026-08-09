import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { isoNow } from '@/utils/date'
import { uploadImage, insertMedia } from '@/api/media/db'
import { useMemberStore } from '@/stores/member'
import { hashFile } from '@/utils/hash'
import { buildCardPayload } from '@/utils/card/payload'
import { type CardBase } from '@type/card'

/**
 * Saves a card with `values` written over it, leaving `card` itself untouched —
 * showing the change early, and undoing it, are the caller's job.
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
  // Named after the bytes, so one picture used on ten cards is stored once. The
  // owner has to stay the first segment for storage's own access check.
  const path = `${member_id}/${await hashFile(file)}.${file.type.split('/')[1]}`

  // Upload before recording it, so the old picture isn't dropped until the new one lands.
  try {
    await uploadImage(bucket, path, file)
  } catch {
    throw new Error('Failed to upload image', { cause: 'upload' })
  }

  try {
    await insertMedia({ bucket, path, card_id, slot })
  } catch {
    throw new Error('Failed to save uploaded image', { cause: 'insert' })
  }
}
