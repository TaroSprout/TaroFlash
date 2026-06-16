import { type CardInput as FSRSCard } from 'ts-fsrs'

export type Review = FSRSCard

export type CardBase = {
  // Persisted columns on the `cards` table.
  id: number
  deck_id?: number
  front_text?: string
  back_text?: string
  note?: string
  created_at?: string
  updated_at?: string
  rank?: number
  member_id?: string

  // View-derived fields (cards_with_images). Optional because they don't
  // appear on direct upserts; they're only present on reads through the view.
  // The runtime allow-list in `src/utils/card/payload.ts` keeps these from
  // leaking into upsert payloads.
  front_image_path?: string
  back_image_path?: string
  is_duplicate?: boolean

  // Joined relation from `reviews` (per-card review state). Optional for the
  // same reason as the view-derived fields above.
  review?: Review
}

declare global {
  type Review = FSRSCard
  type Card = Prettify<CardBase>
  type CardSide = 'front' | 'back' | 'cover'
  type CardSize = '2xl' | 'xl' | 'lg' | 'md' | 'base' | 'sm' | 'xs' | '2xs' | '3xs'
}
