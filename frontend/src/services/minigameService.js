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

export function startHorseRace() {
  return apiFetch('/minigame/horseRace/start', { method: 'POST' })
}

export function placeHorseRaceBet(playerId, playerName, horseId, amount) {
  return apiFetch('/minigame/horseRace/bet', {
    method: 'POST',
    body: JSON.stringify({ playerId, playerName, horseId, amount }),
  })
}

export function runHorseRace() {
  return apiFetch('/minigame/horseRace/run', { method: 'POST' })
}

export function getHorseRaceState() {
  return apiFetch('/minigame/horseRace/state')
}

export function resetHorseRace() {
  return apiFetch('/minigame/horseRace/reset', { method: 'POST' })
}
