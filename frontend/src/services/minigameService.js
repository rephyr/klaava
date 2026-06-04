import apiFetch from './api'

export function playDoubleOrNothing(playerIds, amount) {
  return apiFetch('/minigame/doubleOrNothing', {
    method: 'POST',
    body: JSON.stringify({ playerIds, amount }),
  })
}

export function playLastRoll() {
  return apiFetch('/minigame/lastRoll', { method: 'POST' })
}
