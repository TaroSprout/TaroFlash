export type DropdownOption = {
  label: string
  value: string | number
  icon?: string
  disabled?: boolean
  // Marks the option matching the consumer's current state (e.g. the active
  // chapter). Renders with the same data-active affordance as a live tap.
  selected?: boolean
}
