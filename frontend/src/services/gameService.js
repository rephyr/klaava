import apiFetch from './api'

export function getGameState() {
  return apiFetch('/game')
}

export function getSession() {
  return apiFetch('/game/session')
}

export function startGame(playerIds, mode = null) {
  return apiFetch('/game/start', {
    method: 'POST',
    body: JSON.stringify({ playerIds, mode }),
  })
}

export function stopGame() {
  return apiFetch('/game/stop', { method: 'POST' })
}

export function advanceGame(data) {
  return apiFetch('/game/advance', { method: 'POST', body: JSON.stringify(data) })
}
