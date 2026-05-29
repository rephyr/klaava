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
