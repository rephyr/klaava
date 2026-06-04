import apiFetch from './api'

export function getRouletteState() {
  return apiFetch('/roulette/state')
}

export function startRoulette() {
  return apiFetch('/roulette/start', { method: 'POST' })
}

export function placeBet(playerId, playerName, betType, betValue, amount) {
  return apiFetch('/roulette/bet', {
    method: 'POST',
    body: JSON.stringify({ playerId, playerName, betType, betValue, amount }),
  })
}

export function spin() {
  return apiFetch('/roulette/spin', { method: 'POST' })
}

export function resetRoulette() {
  return apiFetch('/roulette/reset', { method: 'POST' })
}
