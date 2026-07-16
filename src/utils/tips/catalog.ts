export type TipCategory = 'sound' | 'cards' | 'browser' | 'shortcuts' | 'study-session' | 'feedback'

export type Tip = {
  id: string
  category: TipCategory
  title_key: string
  body_key: string
}

/**
 * Single source of truth for tip content. The dashboard rotates through these;
 * a future standalone tips app will browse/filter the same list by `category`.
 */
export const TIPS: Tip[] = [
  {
    id: 'sound',
    category: 'sound',
    title_key: 'tips.sound.title',
    body_key: 'tips.sound.body'
  },
  {
    id: 'cards',
    category: 'cards',
    title_key: 'tips.cards.title',
    body_key: 'tips.cards.body'
  },
  {
    id: 'companion-window',
    category: 'browser',
    title_key: 'tips.companion-window.title',
    body_key: 'tips.companion-window.body'
  },
  {
    id: 'horizontal-scroll',
    category: 'shortcuts',
    title_key: 'tips.horizontal-scroll.title',
    body_key: 'tips.horizontal-scroll.body'
  },
  {
    id: 'swipe-rating',
    category: 'study-session',
    title_key: 'tips.swipe-rating.title',
    body_key: 'tips.swipe-rating.body'
  },
  {
    id: 'feedback',
    category: 'feedback',
    title_key: 'tips.feedback.title',
    body_key: 'tips.feedback.body'
  }
]
