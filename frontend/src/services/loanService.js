import apiFetch from './api'

export function getLoansByPlayer(playerId) {
  return apiFetch(`/loans/${playerId}`)
}

export function createLoan(playerId, amount) {
  return apiFetch('/loans/', { method: 'POST', body: JSON.stringify({ playerId, amount }) })
}

export function repayLoan(loanId) {
  return apiFetch(`/loans/${loanId}/repay`, { method: 'POST' })
}

export function defaultLoan(loanId) {
  return apiFetch(`/loans/${loanId}/default`, { method: 'POST' })
}

export function applyInterest() {
  return apiFetch('/loans/interest/apply', { method: 'POST' })
}
