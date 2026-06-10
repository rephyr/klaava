import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import PlayersView from '../views/admin/players/PlayersView'
import * as playerService from '../services/playerService'

const mockPlayers = [
  { id: 1, name: 'Janne',  klaava: 500, rfid: 'AA:BB:CC:01', eliminated: false },
  { id: 2, name: 'Mikael', klaava: 400, rfid: null,           eliminated: false },
]

function renderPlayers() {
  return render(
    <MemoryRouter>
      <PlayersView />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.spyOn(playerService, 'getPlayers').mockResolvedValue([...mockPlayers])
  vi.spyOn(playerService, 'createPlayer').mockResolvedValue({ id: 3, name: 'Sara', klaava: 500, rfid: null, eliminated: false })
  vi.spyOn(playerService, 'updatePlayer').mockImplementation((id, data) =>
    Promise.resolve({ ...mockPlayers.find((p) => p.id === id), ...data })
  )
  vi.spyOn(playerService, 'deletePlayer').mockResolvedValue({})
})

afterEach(() => vi.restoreAllMocks())

test('renders player names', async () => {
  renderPlayers()
  await waitFor(() => {
    expect(screen.getByText('Janne')).toBeInTheDocument()
    expect(screen.getByText('Mikael')).toBeInTheDocument()
  })
})

test('renders klaava balances', async () => {
  renderPlayers()
  await waitFor(() => {
    expect(screen.getByText('500 kl')).toBeInTheDocument()
    expect(screen.getByText('400 kl')).toBeInTheDocument()
  })
})

test('shows dash for missing RFID', async () => {
  renderPlayers()
  await waitFor(() => {
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

test('clicking edit shows input fields', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await waitFor(() => screen.getAllByText('Edit'))
  await user.click(screen.getAllByText('Edit')[0])
  expect(screen.getByDisplayValue('Janne')).toBeInTheDocument()
})

test('saving edit calls updatePlayer', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await waitFor(() => screen.getAllByText('Edit'))
  await user.click(screen.getAllByText('Edit')[0])
  await user.click(screen.getByText('Save'))
  expect(playerService.updatePlayer).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Janne' }))
})

test('clicking cancel exits edit mode', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await waitFor(() => screen.getAllByText('Edit'))
  await user.click(screen.getAllByText('Edit')[0])
  await user.click(screen.getByText('Cancel'))
  expect(screen.queryByDisplayValue('Janne')).not.toBeInTheDocument()
})

test('clicking delete calls deletePlayer', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await waitFor(() => screen.getAllByText('Delete'))
  await user.click(screen.getAllByText('Delete')[0])
  expect(playerService.deletePlayer).toHaveBeenCalledWith(1)
})

test('deleted player is removed from list', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await waitFor(() => screen.getByText('Janne'))
  await user.click(screen.getAllByText('Delete')[0])
  await waitFor(() => expect(screen.queryByText('Janne')).not.toBeInTheDocument())
})

test('add player form is hidden by default', () => {
  renderPlayers()
  expect(screen.queryByPlaceholderText('optional')).not.toBeInTheDocument()
})

test('add player button shows form', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await user.click(screen.getByText('+ Add player'))
  expect(screen.getByPlaceholderText('optional')).toBeInTheDocument()
})

test('save button is disabled when name is empty', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await user.click(screen.getByText('+ Add player'))
  expect(screen.getByText('Save')).toBeDisabled()
})

test('adding a player calls createPlayer and shows new player', async () => {
  const user = userEvent.setup()
  renderPlayers()
  await user.click(screen.getByText('+ Add player'))
  await user.type(screen.getByRole('textbox', { name: /name/i }), 'Sara')
  await user.click(screen.getByText('Save'))
  expect(playerService.createPlayer).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sara' }))
  await waitFor(() => expect(screen.getByText('Sara')).toBeInTheDocument())
})
