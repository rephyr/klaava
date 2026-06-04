import { useEffect, useState } from 'react'
import { getLoansByPlayer, partialRepayLoan, repayLoan } from '../../../services/loanService'
import { updatePlayer } from '../../../services/playerService'
import { formatKlaava } from '../../../utils/formatters'

function EndRoundPanel({ players, onNextRound, refreshPlayers }) {
  const [loans, setLoans] = useState({})
  const [payAmounts, setPayAmounts] = useState({})

  useEffect(() => {
    loadLoans()
  }, [players])

  async function loadLoans() {
    const loanMap = {}
    await Promise.all(
      players.map(async (p) => {
        loanMap[p.id] = await getLoansByPlayer(p.id)
      })
    )
    setLoans(loanMap)
  }

  async function handleEliminate(playerId) {
    await updatePlayer(playerId, { eliminated: true })
    refreshPlayers()
  }

  async function handlePartialPay(loan, playerId) {
    const amount = Number(payAmounts[loan.id])
    if (!amount || amount <= 0) return
    const updated = await partialRepayLoan(loan.id, amount)
    setLoans((prev) => ({
      ...prev,
      [playerId]: prev[playerId].map((l) => (l.id === loan.id ? updated : l)).filter((l) => l.status === 'active'),
    }))
    setPayAmounts((prev) => ({ ...prev, [loan.id]: '' }))
    refreshPlayers()
  }

  async function handleFullRepay(loan, playerId) {
    const updated = await repayLoan(loan.id)
    setLoans((prev) => ({
      ...prev,
      [playerId]: prev[playerId].filter((l) => l.id !== loan.id),
    }))
    refreshPlayers()
  }

  const sorted = [...players].sort((a, b) => b.klaava - a.klaava)

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((player, i) => {
        const playerLoans = loans[player.id] ?? []
        const totalOwed = playerLoans.reduce((sum, l) => sum + l.amountOwed, 0)
        const inDebt = totalOwed > 0 && player.klaava < totalOwed

        return (
          <div
            key={player.id}
            className={`rounded-xl ${inDebt ? 'bg-red-950 border border-red-800' : 'bg-gray-800'}`}
          >
            {/* Player row */}
            <div className="px-4 py-3 flex items-center gap-3">
              <span className={`text-base font-black w-6 text-right ${i === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                {i + 1}
              </span>
              <p className="font-semibold text-sm w-24">{player.name}</p>
              <p className="text-green-400 text-sm w-20">{formatKlaava(player.klaava)}</p>
              {player.powerup && (
                <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
                  {player.powerup}
                </span>
              )}
              {totalOwed > 0 && (
                <span className={`text-xs ${inDebt ? 'text-red-400 font-semibold' : 'text-gray-500'}`}>
                  owes {formatKlaava(totalOwed)}{inDebt && ' — cannot repay'}
                </span>
              )}
              <button
                onClick={() => handleEliminate(player.id)}
                className="ml-auto bg-red-900 hover:bg-red-800 text-red-300 text-xs px-3 py-1.5 rounded"
              >
                Eliminate
              </button>
            </div>

            {/* Loan rows */}
            {playerLoans.map((loan) => (
              <div
                key={loan.id}
                className="border-t border-gray-700/50 px-4 py-2.5 flex items-center gap-3 flex-wrap"
              >
                <div className="flex gap-3 text-xs text-gray-400 flex-1 min-w-0">
                  <span>
                    Owes <span className="text-red-400 font-semibold">{formatKlaava(loan.amountOwed)}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    loan.turnsActive >= 2 ? 'bg-red-900 text-red-300 font-semibold' : 'bg-gray-700 text-gray-500'
                  }`}>
                    {loan.turnsActive}/3 turns
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={payAmounts[loan.id] ?? ''}
                    onChange={(e) => setPayAmounts((prev) => ({ ...prev, [loan.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePartialPay(loan, player.id)}
                    placeholder="Amount"
                    min={1}
                    max={Math.min(player.klaava, loan.amountOwed)}
                    className="bg-gray-700 rounded px-2 py-1 text-xs text-white w-24"
                  />
                  <button
                    onClick={() => handlePartialPay(loan, player.id)}
                    disabled={!payAmounts[loan.id] || Number(payAmounts[loan.id]) <= 0}
                    className="bg-blue-800 hover:bg-blue-700 disabled:opacity-40 text-white text-xs px-2.5 py-1 rounded"
                  >
                    Pay partial
                  </button>
                  <button
                    onClick={() => handleFullRepay(loan, player.id)}
                    disabled={player.klaava < loan.amountOwed}
                    className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-xs px-2.5 py-1 rounded"
                  >
                    Pay full
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {players.length === 0 && (
        <p className="text-gray-500 text-sm">No active players.</p>
      )}

      <button
        onClick={onNextRound}
        className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded font-semibold w-fit"
      >
        Start next round → Wheel
      </button>
    </div>
  )
}

export default EndRoundPanel
