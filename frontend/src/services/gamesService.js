import apiFetch from './api'

export function getGames() {
  return apiFetch('/games/')
}

export function createGame(data) {
  return apiFetch('/games/', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteGame(id) {
  return apiFetch(`/games/${id}`, { method: 'DELETE' })
}

export function toggleGame(id) {
  return apiFetch(`/games/${id}/toggle`, { method: 'PUT' })
}
