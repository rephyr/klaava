import apiFetch from './api'

export function getLoansByPlayer(playerId) {
  return apiFetch(`/loans/${playerId}`)
}

export function createLoan(playerId, amount, interestRate) {
  const body = interestRate != null
    ? { playerId, amount, interestRate }
    : { playerId, amount }
  return apiFetch('/loans/', { method: 'POST', body: JSON.stringify(body) })
}

export function loanTiers(maxBet, baseRate) {
  return [
    { label: 'Quick Fix',     amount: maxBet * 1, rate: Math.round(baseRate * 0.5 * 100) / 100 },
    { label: 'Shady Deal',    amount: maxBet * 2, rate: baseRate },
    { label: 'Big Loan',      amount: maxBet * 3, rate: Math.round(baseRate * 1.5 * 100) / 100 },
    { label: 'Desperate Bet', amount: maxBet * 4, rate: Math.round(baseRate * 2 * 100) / 100 },
  ]
}

export function repayLoan(loanId) {
  return apiFetch(`/loans/${loanId}/repay`, { method: 'POST' })
}

export function defaultLoan(loanId) {
  return apiFetch(`/loans/${loanId}/default`, { method: 'POST' })
}

export function partialRepayLoan(loanId, amount) {
  return apiFetch(`/loans/${loanId}/partial`, { method: 'POST', body: JSON.stringify({ amount }) })
}

export function applyInterest() {
  return apiFetch('/loans/interest/apply', { method: 'POST' })
}
