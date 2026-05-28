import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import SettingsView from './SettingsView'
import * as settingsService from '../../../services/settingsService'

const mockSettings = {
  startingKlaava: 500,
  initialStake: 50,
  stakeMultiplier: 2.0,
  loanInterestRate: 0.1,
  maxLoanAmount: 200,
  gameMode: 'tournament',
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
    expect(screen.getByLabelText('Initial stake')).toBeInTheDocument()
    expect(screen.getByLabelText('Max loan amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Interest rate per round')).toBeInTheDocument()
  })
})

test('loads settings values from API', async () => {
  renderSettings()
  await waitFor(() => {
    expect(screen.getByLabelText('Starting klaava')).toHaveValue(500)
    expect(screen.getByLabelText('Initial stake')).toHaveValue(50)
  })
})

test('save button calls updateSettings', async () => {
  const user = userEvent.setup()
  renderSettings()
  await waitFor(() => screen.getByText('Save'))
  await user.click(screen.getByText('Save'))
  expect(settingsService.updateSettings).toHaveBeenCalled()
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
