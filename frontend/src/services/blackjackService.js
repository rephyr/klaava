import apiFetch from './api'

export function getBjState() {
  return apiFetch('/blackjack/state')
}

export function startBlackjack(bets) {
  return apiFetch('/blackjack/start', { method: 'POST', body: JSON.stringify({ bets }) })
}

export function hit(playerId, hand = 'main') {
  return apiFetch('/blackjack/hit', { method: 'POST', body: JSON.stringify({ playerId, hand }) })
}

export function stand(playerId, hand = 'main') {
  return apiFetch('/blackjack/stand', { method: 'POST', body: JSON.stringify({ playerId, hand }) })
}

export function split(playerId) {
  return apiFetch('/blackjack/split', { method: 'POST', body: JSON.stringify({ playerId }) })
}

export function doubleDown(playerId, hand = 'main') {
  return apiFetch('/blackjack/double', { method: 'POST', body: JSON.stringify({ playerId, hand }) })
}

export function dealerPlay() {
  return apiFetch('/blackjack/dealer', { method: 'POST' })
}

export function resetBlackjack() {
  return apiFetch('/blackjack/reset', { method: 'POST' })
}
