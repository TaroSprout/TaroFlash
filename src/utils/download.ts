/**
 * Saves text content as a local file download. Browsers only honour a
 * `<a download>` click for this, not a fetch, so this drives a throwaway
 * anchor rather than returning a URL for the caller to handle.
 */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
