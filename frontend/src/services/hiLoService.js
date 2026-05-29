import apiFetch from './api'

export function startHiLo() {
  return apiFetch('/hiLo/start', { method: 'POST' })
}

export function revealCard() {
  return apiFetch('/hiLo/reveal', { method: 'POST' })
}

export function nextRound() {
  return apiFetch('/hiLo/next', { method: 'POST' })
}

export function placeBet(playerId, playerName, guess, amount) {
  return apiFetch('/hiLo/bet', {
    method: 'POST',
    body: JSON.stringify({ playerId, playerName, guess, amount }),
  })
}

export function getHiLoState() {
  return apiFetch('/hiLo/state')
}
