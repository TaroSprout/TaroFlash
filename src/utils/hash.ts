/**
 * SHA-256 hex digest of a file's raw bytes.
 *
 * Used to content-address uploads: identical bytes produce an identical hash,
 * so the same image reused across cards (or as a deck background) maps to a
 * single storage object instead of one copy per use.
 *
 * Reads bytes via FileReader rather than `file.arrayBuffer()` for environment
 * portability (jsdom's File predates `arrayBuffer`).
 */
export async function hashFile(file: File): Promise<string> {
  const bytes = await readArrayBuffer(file)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
