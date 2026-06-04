import { useEffect, useState } from 'react'
import { startHiLo, revealCard, nextRound, placeBet, getHiLoState } from '../../../services/hiLoService'
import { formatKlaava } from '../../../utils/formatters'

function HiLoControl({ players, gameState, onPhaseChange, refreshPlayers }) {
  const [hiloState, setHiloState] = useState(null)
  const [bets, setBets] = useState({})

  useEffect(() => {
    getHiLoState().then(setHiloState)
  }, [])

  const status = hiloState?.status ?? 'idle'
  const currentCard = hiloState?.currentCard

  return (
    <div className="flex flex-col gap-4">
      {currentCard && (
        <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current card</p>
            <span className={`text-3xl font-black ${currentCard.red ? 'text-red-500' : 'text-white'}`}>
              {currentCard.label}{currentCard.suit}
            </span>
          </div>
          {hiloState.result && (
            <p className="text-sm text-gray-400">
              Result: <span className="font-semibold text-white capitalize">{hiloState.result}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={async () => {
            const s = await startHiLo()
            setHiloState(s)
            await onPhaseChange('hiLo')
            setBets({})
          }}
          className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded"
        >
          Start round
        </button>
        <button
          onClick={async () => {
            const s = await revealCard()
            setHiloState(s)
            refreshPlayers()
          }}
          disabled={status !== 'waiting'}
          className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reveal
        </button>
        <button
          onClick={async () => {
            const s = await nextRound()
            setHiloState(s)
            setBets({})
          }}
          disabled={status !== 'revealed'}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next card
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const bet = bets[player.id] ?? { guess: '', amount: gameState.minBet }
          const result = hiloState?.bets?.find((r) => r.playerId === player.id)
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
              {result && (() => {
                const blocked = ['shield', 'immunity'].includes(result.powerupTriggered)
                const MULT = { doubleDown: 2, jackpot: 3 }
                const mult = MULT[result.powerupTriggered] ?? 1
                const boostLabel = result.powerupTriggered === 'jackpot' ? ' JACKPOT!' : result.powerupTriggered === 'doubleDown' ? ' DD!' : ''
                return (
                  <span className={`text-sm font-bold ${
                    blocked ? 'text-blue-300'
                    : result.result === 'correct' ? 'text-green-400'
                    : 'text-red-400'
                  }`}>
                    {blocked && result.powerupTriggered.toUpperCase()}
                    {!blocked && result.result === 'correct' && `✓ CORRECT +${formatKlaava(result.amount * mult)}${boostLabel}`}
                    {!blocked && result.result === 'wrong' && `✗ WRONG -${formatKlaava(result.amount)}`}
                  </span>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HiLoControl
