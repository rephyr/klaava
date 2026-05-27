export function formatCredits(amount) {
  return `${amount} cr`
}

export function formatPlayerName(name) {
  return name?.trim() ?? 'Unknown'
}
