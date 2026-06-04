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

export function transferKlaava(fromPlayerId, toPlayerId, amount) {
  return apiFetch('/game/transfer', {
    method: 'POST',
    body: JSON.stringify({ fromPlayerId, toPlayerId, amount }),
  })
}

export function spinWheel() {
  return apiFetch('/game/wheel/spin', { method: 'POST' })
}

export function endGame() {
  return apiFetch('/game/end', { method: 'POST' })
}

export function getLeaderboard() {
  return apiFetch('/game/leaderboard')
}
