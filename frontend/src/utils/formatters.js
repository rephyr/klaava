export function formatKlaava(amount) {
  return `${amount} kl`
}

export function formatPlayerName(name) {
  return name?.trim() ?? 'Unknown'
}
