import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { downloadTextFile } from '@/utils/download'

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-url'),
    revokeObjectURL: vi.fn()
  })
})

describe('downloadTextFile', () => {
  test('creates and clicks a download anchor with the given filename, then revokes the blob url', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadTextFile('deck.csv', '#separator:comma\r\n#html:false')

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')

    clickSpy.mockRestore()
  })
})
