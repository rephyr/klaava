import { formatKlaava, formatPlayerName } from './formatters'

test('formatKlaava formats amount with kl unit', () => {
  expect(formatKlaava(500)).toBe('500 kl')
})

test('formatKlaava works with zero', () => {
  expect(formatKlaava(0)).toBe('0 kl')
})

test('formatPlayerName trims whitespace', () => {
  expect(formatPlayerName('  Janne  ')).toBe('Janne')
})

test('formatPlayerName returns Unknown for null', () => {
  expect(formatPlayerName(null)).toBe('Unknown')
})

test('formatPlayerName returns Unknown for undefined', () => {
  expect(formatPlayerName(undefined)).toBe('Unknown')
})
