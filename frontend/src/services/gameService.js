import apiFetch from './api'

export function getGameState() {
  return apiFetch('/game')
}
