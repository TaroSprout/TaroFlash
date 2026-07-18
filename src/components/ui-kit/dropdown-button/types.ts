export type DropdownOption = {
  label: string
  value: string | number
  icon?: string
  disabled?: boolean
  // Marks the option matching the consumer's current state (e.g. the active
  // chapter). Renders with the same data-active affordance as a live tap.
  selected?: boolean
  // Draws a divider above this option, splitting the menu into groups (e.g. a
  // list of things, then the actions that operate on them).
  separator?: boolean
}
