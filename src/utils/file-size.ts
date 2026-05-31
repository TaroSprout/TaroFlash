/** Format a byte count as a megabyte label, e.g. `2097152` → `"2 MB"`. */
export function bytesToMbLabel(bytes: number): string {
  return `${+(bytes / 1024 / 1024).toFixed(1)} MB`
}
