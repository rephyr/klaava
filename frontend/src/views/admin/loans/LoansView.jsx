import { useEffect, useState } from 'react'
import { getPlayers } from '../../../services/playerService'
import { getLoansByPlayer, createLoan, repayLoan, defaultLoan, applyInterest } from '../../../services/loanService'
import { getSettings } from '../../../services/settingsService'
import { formatKlaava } from '../../../utils/formatters'

function LoansView() {
  const [players, setPlayers] = useState([])
  const [loans, setLoans] = useState({})
  const [loanAmounts, setLoanAmounts] = useState({})
  const [settings, setSettings] = useState(null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [all, s] = await Promise.all([getPlayers(), getSettings()])
    const active = all.filter((p) => !p.eliminated)
    setPlayers(active)
    setSettings(s)
    const loanMap = {}
    await Promise.all(
      active.map(async (p) => {
        loanMap[p.id] = await getLoansByPlayer(p.id)
      })
    )
    setLoans(loanMap)
  }

  function showFeedback(msg, error = false) {
    setFeedback({ msg, error })
    setTimeout(() => setFeedback(null), 3500)
  }

  async function handleIssue(player) {
    const amount = Number(loanAmounts[player.id])
    if (!amount || amount <= 0) return
    try {
      const loan = await createLoan(player.id, amount)
      setLoans((prev) => ({ ...prev, [player.id]: [...(prev[player.id] ?? []), loan] }))
      setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, klaava: p.klaava + amount } : p))
      setLoanAmounts((prev) => ({ ...prev, [player.id]: '' }))
      showFeedback(`Issued ${formatKlaava(amount)} loan to ${player.name}`)
    } catch {
      showFeedback('Failed — exceeds max loan amount or server error', true)
    }
  }

  async function handleRepay(loan, playerId) {
    try {
      const updated = await repayLoan(loan.id)
      setLoans((prev) => ({ ...prev, [playerId]: prev[playerId].filter((l) => l.id !== loan.id) }))
      setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, klaava: p.klaava - loan.amountOwed } : p))
      showFeedback(`Loan of ${formatKlaava(loan.amount)} repaid`)
    } catch {
      showFeedback('Repay failed — player may not have enough klaava', true)
    }
  }

  async function handleDefault(loan, playerId) {
    await defaultLoan(loan.id)
    setPlayers((prev) => prev.filter((p) => p.id !== playerId))
    setLoans((prev) => {
      const next = { ...prev }
      delete next[playerId]
      return next
    })
    showFeedback('Player defaulted and eliminated')
  }

  async function handleApplyInterest() {
    const updated = await applyInterest()
    setLoans((prev) => {
      const next = { ...prev }
      updated.forEach((loan) => {
        if (next[loan.playerId]) {
          next[loan.playerId] = next[loan.playerId].map((l) => l.id === loan.id ? loan : l)
        }
      })
      return next
    })
    showFeedback(`Interest applied to ${updated.length} active loan${updated.length !== 1 ? 's' : ''}`)
  }

  const totalActiveLoans = Object.values(loans).flat().length

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Loans</h2>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleApplyInterest}
          disabled={totalActiveLoans === 0}
          className="bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded"
        >
          Apply Interest to All
        </button>
        {settings && (
          <p className="text-xs text-gray-500">
            Default rate: {(settings.loanInterestRate * 100).toFixed(0)}% · Max loan: {formatKlaava(settings.maxLoanAmount)}
          </p>
        )}
        {feedback && (
          <p className={`text-sm font-medium ${feedback.error ? 'text-red-400' : 'text-green-400'}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {players.map((player) => {
          const playerLoans = loans[player.id] ?? []
          const amount = loanAmounts[player.id] ?? ''

          return (
            <div key={player.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <p className="font-semibold text-base w-28">{player.name}</p>
                <p className="text-green-400 text-sm">{formatKlaava(player.klaava)}</p>
                {playerLoans.length > 0 && (
                  <span className="text-xs text-yellow-400 bg-yellow-900/40 px-2 py-0.5 rounded-full">
                    {playerLoans.length} active loan{playerLoans.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {playerLoans.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {playerLoans.map((loan) => (
                    <div key={loan.id} className="bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-4 text-sm">
                      <span className="text-gray-300">
                        Loan <span className="font-medium">{formatKlaava(loan.amount)}</span>
                      </span>
                      <span className="text-red-400">
                        Owes <span className="font-medium">{formatKlaava(loan.amountOwed)}</span>
                      </span>
                      <span className="text-gray-500 text-xs">
                        {(loan.interestRate * 100).toFixed(0)}% interest
                      </span>
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => handleRepay(loan, player.id)}
                          className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded"
                        >
                          Repay {formatKlaava(loan.amountOwed)}
                        </button>
                        <button
                          onClick={() => handleDefault(loan, player.id)}
                          className="bg-red-800 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                        >
                          Default
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setLoanAmounts((prev) => ({ ...prev, [player.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleIssue(player)}
                  placeholder="Amount"
                  min={1}
                  max={settings?.maxLoanAmount}
                  className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-28"
                />
                <button
                  onClick={() => handleIssue(player)}
                  disabled={!amount || Number(amount) <= 0}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded"
                >
                  Issue loan
                </button>
              </div>
            </div>
          )
        })}

        {players.length === 0 && (
          <p className="text-gray-500 text-sm">No active players.</p>
        )}
      </div>
    </div>
  )
}

export default LoansView
