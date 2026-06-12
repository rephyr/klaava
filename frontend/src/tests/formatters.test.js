import { formatKlaava } from '../utils/formatters'

test('formatKlaava formats amount with kl unit', () => {
  expect(formatKlaava(500)).toBe('500 kl')
})

test('formatKlaava works with zero', () => {
  expect(formatKlaava(0)).toBe('0 kl')
})
