import { useState } from 'react'
import { startHiLo, revealCard, nextRound, placeBet } from '../../../services/hiLoService'
import { formatKlaava } from '../../../utils/formatters'

function HiLoControl({ players, gameState, onPhaseChange, refreshPlayers }) {
  const [hiloResults, setHiloResults] = useState(null)
  const [bets, setBets] = useState({})

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await startHiLo()
            await onPhaseChange('hiLo')
            setBets({})
            setHiloResults(null)
          }}
          className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded"
        >
          Start round
        </button>
        <button
          onClick={async () => {
            const state = await revealCard()
            setHiloResults(state.bets)
            refreshPlayers()
          }}
          className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
        >
          Reveal
        </button>
        <button
          onClick={async () => {
            await nextRound()
            setBets({})
            setHiloResults(null)
          }}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded"
        >
          Next card
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const bet = bets[player.id] ?? { guess: '', amount: gameState.minBet }
          const result = hiloResults?.find((r) => r.playerId === player.id)
          return (
            <div key={player.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
              <p className="w-24 font-medium text-sm">{player.name}</p>
              <p className="text-green-400 text-sm w-20">{formatKlaava(player.klaava)}</p>
              <div className="flex gap-1">
                {['higher', 'lower'].map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      const updated = { ...bet, guess: g }
                      setBets((prev) => ({ ...prev, [player.id]: updated }))
                      placeBet(player.id, player.name, g, updated.amount)
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-colors ${
                      bet.guess === g
                        ? g === 'higher' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {g === 'higher' ? '⬆ Hi' : '⬇ Lo'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={bet.amount}
                onChange={(e) => {
                  const updated = { ...bet, amount: Number(e.target.value) }
                  setBets((prev) => ({ ...prev, [player.id]: updated }))
                  if (bet.guess) placeBet(player.id, player.name, bet.guess, updated.amount)
                }}
                className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-20"
              />
              {result && (
                <span className={`text-sm font-bold ${result.result === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                  {result.result === 'correct'
                    ? `✓ CORRECT +${formatKlaava(result.amount)}`
                    : `✗ WRONG -${formatKlaava(result.amount)}`}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HiLoControl
