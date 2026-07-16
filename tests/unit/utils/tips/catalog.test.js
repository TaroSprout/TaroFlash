import { describe, test, expect } from 'vite-plus/test'
import { TIPS } from '@/utils/tips/catalog'

describe('tips catalog', () => {
  test('every tip has non-empty id, category, title_key, and body_key', () => {
    for (const tip of TIPS) {
      expect(tip.id).toBeTruthy()
      expect(tip.category).toBeTruthy()
      expect(tip.title_key).toBeTruthy()
      expect(tip.body_key).toBeTruthy()
    }
  })

  test('tip ids are unique', () => {
    const ids = TIPS.map((tip) => tip.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
