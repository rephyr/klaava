import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import EndRoundPanel from '../views/admin/endRound/EndRoundPanel'
import * as loanService from '../services/loanService'
import * as playerService from '../services/playerService'

const mockPlayers = [
  { id: 1, name: 'Alice', klaava: 800, powerup: null, eliminated: false },
  { id: 2, name: 'Bob',   klaava: 400, powerup: null, eliminated: false },
]

beforeEach(() => {
  vi.spyOn(loanService, 'getLoansByPlayer').mockResolvedValue([])
  vi.spyOn(playerService, 'updatePlayer').mockResolvedValue({})
})

afterEach(() => vi.restoreAllMocks())

function renderPanel(props = {}) {
  return render(
    <EndRoundPanel
      players={mockPlayers}
      isLastRound={false}
      onNextRound={vi.fn()}
      onFinalRound={vi.fn()}
      refreshPlayers={vi.fn()}
      {...props}
    />
  )
}

test('shows next round button when not last round', async () => {
  renderPanel({ isLastRound: false })
  await waitFor(() => {
    expect(screen.getByText(/Start next round/)).toBeInTheDocument()
    expect(screen.queryByText(/Show winner screen/)).not.toBeInTheDocument()
  })
})

test('shows winner screen button on last round', async () => {
  renderPanel({ isLastRound: true })
  await waitFor(() => {
    expect(screen.getByText(/Show winner screen/)).toBeInTheDocument()
    expect(screen.queryByText(/Start next round/)).not.toBeInTheDocument()
  })
})

test('next round button calls onNextRound', async () => {
  const user = userEvent.setup()
  const onNextRound = vi.fn()
  renderPanel({ isLastRound: false, onNextRound })
  await waitFor(() => screen.getByText(/Start next round/))
  await user.click(screen.getByText(/Start next round/))
  expect(onNextRound).toHaveBeenCalled()
})

test('winner screen button calls onFinalRound', async () => {
  const user = userEvent.setup()
  const onFinalRound = vi.fn()
  renderPanel({ isLastRound: true, onFinalRound })
  await waitFor(() => screen.getByText(/Show winner screen/))
  await user.click(screen.getByText(/Show winner screen/))
  expect(onFinalRound).toHaveBeenCalled()
})

test('renders player names', async () => {
  renderPanel()
  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
})
