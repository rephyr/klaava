import { useState } from 'react'
import { startBlackjack, hit, stand, dealerPlay, resetBlackjack } from '../../../services/blackjackService'
import { formatKlaava } from '../../../utils/formatters'

const RESULT_COLOR = {
  win:       'text-green-400',
  lose:      'text-red-400',
  push:      'text-gray-400',
  blackjack: 'text-yellow-400',
}

function BlackjackControl({ players, defaultBet, onStateChange, refreshPlayers }) {
  const [bets, setBets] = useState({})
  const [bjState, setBjState] = useState(null)

  const activePlayers = players.filter((p) => !p.eliminated)

  async function handleStart() {
    const betList = activePlayers.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      amount: Number(bets[p.id] ?? defaultBet),
    }))
    const state = await startBlackjack(betList)
    setBjState(state)
    onStateChange('blackjack')
  }

  async function handleHit(playerId) {
    const state = await hit(playerId)
    setBjState(state)
  }

  async function handleStand(playerId) {
    const state = await stand(playerId)
    setBjState(state)
  }

  async function handleDealer() {
    const state = await dealerPlay()
    setBjState(state)
    onStateChange('blackjack')
    refreshPlayers?.()
  }

  async function handleReset() {
    await resetBlackjack()
    setBjState(null)
    setBets({})
  }

  const allDone = bjState?.players.every((p) => p.status !== 'active')

  if (!bjState || bjState.status === 'idle') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {activePlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <p className="w-24 text-sm font-medium">{p.name}</p>
              <p className="text-green-400 text-sm w-20">{formatKlaava(p.klaava)}</p>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-500">Bet</label>
                <input
                  type="number"
                  value={bets[p.id] ?? defaultBet}
                  onChange={(e) => setBets((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-20"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleStart}
          disabled={activePlayers.length === 0}
          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded w-fit mt-2"
        >
          Deal cards
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      <div className="bg-gray-900 rounded-xl p-3 flex flex-col gap-1">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Dealer</p>
        <p className="text-sm">
          {bjState.dealer.hand.map((c) => `${c.label}${c.suit}`).join(' ')}
          {bjState.dealer.hiddenCard ? ' ?' : ''}
          {' '}
          <span className="text-gray-400">= {bjState.dealer.hiddenCard ? '?' : bjState.dealer.total}</span>
        </p>
      </div>

      {bjState.players.map((player) => (
        <div key={player.playerId} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
          <div className="w-24">
            <p className="font-medium text-sm">{player.playerName}</p>
            <p className="text-xs text-gray-400">{formatKlaava(player.amount)} bet</p>
          </div>
          <p className="text-sm text-gray-300 w-40">
            {player.hand.map((c) => `${c.label}${c.suit}`).join(' ')} = <span className="font-bold">{player.total}</span>
          </p>
          <div className="flex gap-2">
            {player.status === 'active' && (
              <>
                <button
                  onClick={() => handleHit(player.playerId)}
                  className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded"
                >
                  Hit
                </button>
                <button
                  onClick={() => handleStand(player.playerId)}
                  className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5 rounded"
                >
                  Stand
                </button>
              </>
            )}
            {player.status !== 'active' && !player.result && (
              <span className="text-xs text-gray-400 capitalize">{player.status}</span>
            )}
            {player.result && (() => {
              const blocked = ['shield', 'immunity'].includes(player.powerupTriggered)
              const MULT = { doubleDown: 2, jackpot: 3 }
              const mult = MULT[player.powerupTriggered] ?? 1
              const boostLabel = player.powerupTriggered === 'jackpot' ? ' JACKPOT!' : player.powerupTriggered === 'doubleDown' ? ' DD!' : ''
              return (
                <span className={`text-sm font-bold ${blocked ? 'text-blue-300' : RESULT_COLOR[player.result]}`}>
                  {blocked && player.powerupTriggered.toUpperCase()}
                  {!blocked && player.result === 'win' && `WIN +${formatKlaava(player.amount * mult)}${boostLabel}`}
                  {!blocked && player.result === 'lose' && `LOSE -${formatKlaava(player.amount)}`}
                  {!blocked && player.result === 'push' && 'PUSH'}
                  {!blocked && player.result === 'blackjack' && `BLACKJACK +${formatKlaava(Math.ceil(player.amount * 1.5) * mult)}${boostLabel}`}
                </span>
              )
            })()}
          </div>
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        {allDone && bjState.status === 'playing' && (
          <button
            onClick={handleDealer}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded"
          >
            Dealer plays
          </button>
        )}
        {bjState.status === 'finished' && (
          <button
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded"
          >
            New round
          </button>
        )}
      </div>

    </div>
  )
}

export default BlackjackControl
