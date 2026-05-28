import apiFetch from './api'

export function getPlayers() {
  return apiFetch('/players/')
}

export function getPlayer(id) {
  return apiFetch(`/players/${id}`)
}

export function createPlayer(data) {
  return apiFetch('/players/', { method: 'POST', body: JSON.stringify(data) })
}

export function updatePlayer(id, data) {
  return apiFetch(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deletePlayer(id) {
  return apiFetch(`/players/${id}`, { method: 'DELETE' })
}
