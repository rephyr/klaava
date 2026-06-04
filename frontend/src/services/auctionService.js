import apiFetch from './api'

export function getAuctionItems() {
  return apiFetch('/auction/items')
}

export function getAuctionState() {
  return apiFetch('/auction/state')
}

export function startAuction(itemId) {
  return apiFetch('/auction/start', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  })
}

export function placeBid(playerId, amount) {
  return apiFetch('/auction/bid', {
    method: 'POST',
    body: JSON.stringify({ playerId, amount }),
  })
}

export function endAuction() {
  return apiFetch('/auction/end', { method: 'POST' })
}

export function resetAuction() {
  return apiFetch('/auction/reset', { method: 'POST' })
}
