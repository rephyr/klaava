import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import DisplayView from '../views/display/DisplayView'
import * as gameService from '../services/gameService'

const mockPlayers = [
  { id: 1, name: 'Janne', klaava: 500, rfid: 'AA:BB:CC:01', eliminated: false },
  { id: 2, name: 'Sara',  klaava: 300, rfid: 'AA:BB:CC:02', eliminated: false },
]

const mockGameState = {
  phase: 'gambling',
  round: 1,
  level: 1,
  minBet: 50,
  maxBet: 200,
  betMultiplier: 2.0,
  sessionId: 42,
  totalRounds: 3,
}

const mockSession = {
  id: 42,
  mode: 'tournament',
  status: 'active',
  currentPhase: 'gambling',
  currentRound: 1,
  currentLevel: 1,
  currentMinBet: 50,
  currentMaxBet: 200,
  players: mockPlayers,
}

function renderDisplay() {
  return render(
    <MemoryRouter>
      <DisplayView />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.spyOn(gameService, 'getGameState').mockResolvedValue(mockGameState)
  vi.spyOn(gameService, 'getSession').mockResolvedValue(mockSession)
})

afterEach(() => vi.restoreAllMocks())

test('renders title', () => {
  renderDisplay()
  expect(screen.getByText('Klaava')).toBeInTheDocument()
})

test('renders players from session', async () => {
  renderDisplay()
  await waitFor(() => {
    expect(screen.getAllByText('Janne').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sara').length).toBeGreaterThan(0)
  })
})

test('renders player klaava balance', async () => {
  renderDisplay()
  await waitFor(() => {
    expect(screen.getAllByText('500 kl').length).toBeGreaterThan(0)
    expect(screen.getAllByText('300 kl').length).toBeGreaterThan(0)
  })
})

test('renders round info in leaderboard', async () => {
  renderDisplay()
  await waitFor(() => {
    expect(screen.getAllByText(/round/i).length).toBeGreaterThan(0)
  })
})

test('renders admin button', () => {
  renderDisplay()
  expect(screen.getByText('Admin')).toBeInTheDocument()
})

test('shows lobby screen when no session', async () => {
  vi.spyOn(gameService, 'getGameState').mockResolvedValue({
    phase: 'lobby', round: 0, level: 1, minBet: 50, maxBet: 200, betMultiplier: 2.0, sessionId: null, totalRounds: 3,
  })
  renderDisplay()
  await waitFor(() => {
    expect(screen.getByText(/waiting for players/i)).toBeInTheDocument()
  })
})
