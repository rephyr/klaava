import apiFetch from './api'

export function getPowerups() {
  return apiFetch('/shop/')
}

export function buyPowerup(playerId, powerupId) {
  return apiFetch('/shop/buy', {
    method: 'POST',
    body: JSON.stringify({ playerId, powerupId }),
  })
}

export function useItem(playerId, targetId = null) {
  return apiFetch('/shop/use', {
    method: 'POST',
    body: JSON.stringify({ playerId, targetId }),
  })
}
