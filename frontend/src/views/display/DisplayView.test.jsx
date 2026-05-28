import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import DisplayView from './DisplayView'
import * as playerService from '../../services/playerService'
import * as gameService from '../../services/gameService'

const mockPlayers = [
  { id: 1, name: 'Janne', klaava: 500, rfid: 'AA:BB:CC:01', eliminated: false },
  { id: 2, name: 'Sara',  klaava: 300, rfid: 'AA:BB:CC:02', eliminated: false },
]

const mockGameState = { phase: 'gambling', round: 1, level: 1, stake: 50 }

function renderDisplay() {
  return render(
    <MemoryRouter>
      <DisplayView />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.spyOn(playerService, 'getPlayers').mockResolvedValue(mockPlayers)
  vi.spyOn(gameService, 'getGameState').mockResolvedValue(mockGameState)
})

afterEach(() => vi.restoreAllMocks())

test('renders title', () => {
  renderDisplay()
  expect(screen.getByText('Klaava')).toBeInTheDocument()
})

test('renders players from API', async () => {
  renderDisplay()
  await waitFor(() => {
    expect(screen.getByText('Janne')).toBeInTheDocument()
    expect(screen.getByText('Sara')).toBeInTheDocument()
  })
})

test('renders player klaava balance', async () => {
  renderDisplay()
  await waitFor(() => {
    expect(screen.getByText('500 kl')).toBeInTheDocument()
    expect(screen.getByText('300 kl')).toBeInTheDocument()
  })
})

test('renders game state info', async () => {
  renderDisplay()
  await waitFor(() => {
    expect(screen.getByText(/round 1/i)).toBeInTheDocument()
    expect(screen.getByText(/level 1/i)).toBeInTheDocument()
  })
})

test('renders admin button', () => {
  renderDisplay()
  expect(screen.getByText('Admin')).toBeInTheDocument()
})
