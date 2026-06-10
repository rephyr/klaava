import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import SettingsView from '../views/admin/settings/SettingsView'
import * as settingsService from '../services/settingsService'

const mockSettings = {
  startingKlaava: 500,
  minBet: 50,
  maxBet: 200,
  betMultiplier: 2.0,
  loanInterestRate: 0.1,
  maxLoanAmount: 200,
  gameMode: 'tournament',
  totalRounds: 3,
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsView />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ ...mockSettings })
  vi.spyOn(settingsService, 'updateSettings').mockResolvedValue({ ...mockSettings })
})

afterEach(() => vi.restoreAllMocks())

test('renders settings fields', async () => {
  renderSettings()
  await waitFor(() => {
    expect(screen.getByLabelText('Starting klaava')).toBeInTheDocument()
    expect(screen.getByLabelText('Min bet')).toBeInTheDocument()
    expect(screen.getByLabelText('Max bet')).toBeInTheDocument()
    expect(screen.getByLabelText('Bet multiplier per level')).toBeInTheDocument()
    expect(screen.getByLabelText('Max loan amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Interest rate per round')).toBeInTheDocument()
    expect(screen.getByLabelText('Number of rounds')).toBeInTheDocument()
  })
})

test('loads settings values from API', async () => {
  renderSettings()
  await waitFor(() => {
    expect(screen.getByLabelText('Starting klaava')).toHaveValue(500)
    expect(screen.getByLabelText('Min bet')).toHaveValue(50)
    expect(screen.getByLabelText('Max bet')).toHaveValue(200)
  })
})

test('loads totalRounds value from API', async () => {
  renderSettings()
  await waitFor(() => {
    expect(screen.getByLabelText('Number of rounds')).toHaveValue(3)
  })
})

test('save button calls updateSettings', async () => {
  const user = userEvent.setup()
  renderSettings()
  await waitFor(() => screen.getByText('Save'))
  await user.click(screen.getByText('Save'))
  expect(settingsService.updateSettings).toHaveBeenCalled()
})

test('save includes totalRounds', async () => {
  const user = userEvent.setup()
  renderSettings()
  await waitFor(() => screen.getByText('Save'))
  await user.click(screen.getByText('Save'))
  expect(settingsService.updateSettings).toHaveBeenCalledWith(
    expect.objectContaining({ totalRounds: 3 })
  )
})

test('shows saved confirmation after save', async () => {
  const user = userEvent.setup()
  renderSettings()
  await waitFor(() => screen.getByText('Save'))
  await user.click(screen.getByText('Save'))
  await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
})

test('changing a field hides saved confirmation', async () => {
  const user = userEvent.setup()
  renderSettings()
  await waitFor(() => screen.getByText('Save'))
  await user.click(screen.getByText('Save'))
  await waitFor(() => screen.getByText('Saved'))
  await user.clear(screen.getByLabelText('Starting klaava'))
  await user.type(screen.getByLabelText('Starting klaava'), '300')
  expect(screen.queryByText('Saved')).not.toBeInTheDocument()
})
