declare type Media = {
  id?: string
  created_at?: string
  deleted_at?: string
  card_id?: number
  deck_id?: number
  slot: MediaSlot
  bucket: string
  path: string
}

declare type MediaSlot = 'card_front' | 'card_back' | 'deck_cover'
