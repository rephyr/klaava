import { useEffect, useState } from 'react'
import { getLoansByPlayer } from '../../../services/loanService'
import { updatePlayer } from '../../../services/playerService'
import { formatKlaava } from '../../../utils/formatters'

function EndRoundPanel({ players, onNextRound, refreshPlayers }) {
  const [loans, setLoans] = useState({})

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
            className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
              inDebt ? 'bg-red-950 border border-red-800' : 'bg-gray-800'
            }`}
          >
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
