/**
 * A file's fingerprint, taken from its bytes alone — so the same picture used
 * on ten cards is stored once, whatever it was named on the way in.
 *
 * Reads through `FileReader` rather than the shorter modern call, which the
 * test environment's `File` doesn't have.
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
