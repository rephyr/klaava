import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../../../services/settingsService'
import { createBackup, restoreBackup } from '../../../services/backupService'

function SettingField({ label, id, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-gray-400">{label}</label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={onChange}
        className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-40"
      />
    </div>
  )
}

function SettingsView() {
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState(null)

  async function handleBackup() {
    await createBackup()
    setBackupMsg('Backup created')
    setTimeout(() => setBackupMsg(null), 3000)
  }

  async function handleRestore() {
    if (!window.confirm('Restore from backup? This will overwrite current player data.')) return
    await restoreBackup()
    setBackupMsg('Restored from backup')
    setTimeout(() => setBackupMsg(null), 3000)
  }

  useEffect(() => {
    getSettings().then(setForm)
  }, [])

  function handleChange(field, value) {
    setForm({ ...form, [field]: value })
    setSaved(false)
  }

  async function handleSave() {
    await updateSettings({
      startingKlaava: Number(form.startingKlaava),
      minBet: Number(form.minBet),
      maxBet: Number(form.maxBet),
      betMultiplier: Number(form.betMultiplier),
      loanInterestRate: Number(form.loanInterestRate),
      maxLoanAmount: Number(form.maxLoanAmount),
      gameMode: form.gameMode,
      totalRounds: Number(form.totalRounds),
    })
    setSaved(true)
  }

  if (!form) return <p className="text-gray-400 text-sm">Loading...</p>

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      <div className="flex flex-col gap-6 max-w-md">

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Game</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="gameMode" className="text-xs text-gray-400">Game mode</label>
              <select
                id="gameMode"
                value={form.gameMode}
                onChange={(e) => handleChange('gameMode', e.target.value)}
                className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-40"
              >
                <option value="tournament">Tournament</option>
                <option value="sit_and_go">Sit and go</option>
              </select>
            </div>
            <SettingField
              label="Number of rounds"
              id="totalRounds"
              value={form.totalRounds}
              onChange={(e) => handleChange('totalRounds', e.target.value)}
            />
            <SettingField
              label="Starting klaava"
              id="startingKlaava"
              value={form.startingKlaava}
              onChange={(e) => handleChange('startingKlaava', e.target.value)}
            />
          </div>
        </section>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Betting</p>
          <div className="flex flex-col gap-4">
            <SettingField
              label="Min bet"
              id="minBet"
              value={form.minBet}
              onChange={(e) => handleChange('minBet', e.target.value)}
            />
            <SettingField
              label="Max bet"
              id="maxBet"
              value={form.maxBet}
              onChange={(e) => handleChange('maxBet', e.target.value)}
            />
            <SettingField
              label="Bet multiplier per level"
              id="betMultiplier"
              value={form.betMultiplier}
              onChange={(e) => handleChange('betMultiplier', e.target.value)}
            />
          </div>
        </section>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Loans</p>
          <div className="flex flex-col gap-4">
            <SettingField
              label="Max loan amount"
              id="maxLoanAmount"
              value={form.maxLoanAmount}
              onChange={(e) => handleChange('maxLoanAmount', e.target.value)}
            />
            <SettingField
              label="Interest rate per round"
              id="loanInterestRate"
              value={form.loanInterestRate}
              onChange={(e) => handleChange('loanInterestRate', e.target.value)}
            />
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2 rounded"
          >
            Save
          </button>
          {saved && <p className="text-green-400 text-sm">Saved</p>}
        </div>

        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Backup</p>
          <div className="flex gap-3 items-center">
            <button
              onClick={handleBackup}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded"
            >
              Backup now
            </button>
            <button
              onClick={handleRestore}
              className="bg-red-800 hover:bg-red-700 text-white text-sm px-4 py-2 rounded"
            >
              Restore from backup
            </button>
            {backupMsg && <p className="text-green-400 text-sm">{backupMsg}</p>}
          </div>
        </section>

      </div>
    </div>
  )
}

export default SettingsView
