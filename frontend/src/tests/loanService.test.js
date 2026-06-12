import { loanTiers } from '../services/loanService'

test('loanTiers returns 4 tiers', () => {
  const tiers = loanTiers(200, 0.25)
  expect(tiers).toHaveLength(4)
})

test('loanTiers amounts scale with maxBet', () => {
  const tiers = loanTiers(200, 0.25)
  expect(tiers[0].amount).toBe(200)   // 1x
  expect(tiers[1].amount).toBe(400)   // 2x
  expect(tiers[2].amount).toBe(600)   // 3x
  expect(tiers[3].amount).toBe(800)   // 4x
})

test('loanTiers rates scale with baseRate', () => {
  const tiers = loanTiers(200, 0.25)
  expect(tiers[0].rate).toBe(0.13)    // 0.5x rounded
  expect(tiers[1].rate).toBe(0.25)    // 1x
  expect(tiers[2].rate).toBe(0.38)    // 1.5x rounded
  expect(tiers[3].rate).toBe(0.5)     // 2x
})

test('loanTiers tier labels are correct', () => {
  const tiers = loanTiers(100, 0.1)
  expect(tiers.map(t => t.label)).toEqual([
    'Quick Fix',
    'Shady Deal',
    'Big Loan',
    'Desperate Bet',
  ])
})
