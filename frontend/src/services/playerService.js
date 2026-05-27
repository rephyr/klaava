import apiFetch from './api'

export function getPlayers() {
  return apiFetch('/players')
}

export function getPlayer(id) {
  return apiFetch(`/players/${id}`)
}
