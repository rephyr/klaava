import { useState } from 'react'
import { startBlackjack, hit, stand, split, doubleDown, dealerPlay, resetBlackjack } from '../../../services/blackjackService'
import { formatKlaava } from '../../../utils/formatters'

const RESULT_COLOR = {
  win:       'text-green-400',
  lose:      'text-red-400',
  push:      'text-gray-400',
  blackjack: 'text-yellow-400',
}

function HandRow({ label, cards, total, status, result, amount, powerupTriggered, onHit, onStand, onDouble }) {
  const canHit    = status === 'active'
  const canDouble = status === 'active' && cards.length === 2

  const blocked  = ['shield', 'immunity'].includes(powerupTriggered)
  const MULT     = { doubleDown: 2, jackpot: 3 }
  const mult     = MULT[powerupTriggered] ?? 1
  const boostLbl = powerupTriggered === 'jackpot' ? ' JACKPOT!' : powerupTriggered === 'doubleDown' ? ' DD!' : ''

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {label && <span className="text-xs text-gray-500 w-10">{label}</span>}
      <p className="text-sm text-gray-300 min-w-36">
        {cards.map((c) => `${c.label}${c.suit}`).join(' ')} = <span className="font-bold">{total}</span>
        {amount && <span className="text-gray-500 ml-2">{formatKlaava(amount)}</span>}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {canHit && (
          <>
            <button onClick={onHit}    className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded">Hit</button>
            <button onClick={onStand}  className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5 rounded">Stand</button>
          </>
        )}
        {canDouble && (
          <button onClick={onDouble} className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded">2×</button>
        )}
        {!canHit && !result && (
          <span className="text-xs text-gray-400 capitalize">{status}</span>
        )}
        {result && (
          <span className={`text-sm font-bold ${blocked ? 'text-blue-300' : RESULT_COLOR[result]}`}>
            {blocked && powerupTriggered.toUpperCase()}
            {!blocked && result === 'win'       && `WIN +${formatKlaava(amount * mult)}${boostLbl}`}
            {!blocked && result === 'lose'      && `LOSE -${formatKlaava(amount)}`}
            {!blocked && result === 'push'      && 'PUSH'}
            {!blocked && result === 'blackjack' && `BLACKJACK +${formatKlaava(Math.ceil(amount * 1.5) * mult)}${boostLbl}`}
          </span>
        )}
      </div>
    </div>
  )
}

function BlackjackControl({ players, defaultBet, onStateChange, refreshPlayers }) {
  const [bets, setBets]       = useState({})
  const [bjState, setBjState] = useState(null)

  const activePlayers = players.filter((p) => !p.eliminated)

  async function handleStart() {
    const betList = activePlayers.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      amount: Number(bets[p.id] ?? defaultBet),
    }))
    setBjState(await startBlackjack(betList))
    onStateChange('blackjack')
  }

  async function call(fn, ...args) { setBjState(await fn(...args)) }

  const allDone = bjState?.players.every(
    (p) => p.status !== 'active' && (!p.splitHand || p.splitStatus !== 'active')
  )

  async function handleDealer() {
    setBjState(await dealerPlay())
    onStateChange('blackjack')
    refreshPlayers?.()
  }

  async function handleReset() {
    await resetBlackjack()
    setBjState(null)
    setBets({})
  }

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

      <div className="bg-gray-900 rounded-xl p-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Dealer</p>
        <p className="text-sm">
          {bjState.dealer.hand.map((c) => `${c.label}${c.suit}`).join(' ')}
          {bjState.dealer.hiddenCard ? ' ?' : ''}
          {' '}<span className="text-gray-400">= {bjState.dealer.hiddenCard ? '?' : bjState.dealer.total}</span>
        </p>
      </div>

      {bjState.players.map((player) => {
        const canSplit = player.status === 'active' &&
          player.hand.length === 2 &&
          player.hand[0].value === player.hand[1].value &&
          !player.splitHand

        return (
          <div key={player.playerId} className="bg-gray-800 rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <p className="font-medium text-sm w-24">{player.playerName}</p>
              <p className="text-xs text-gray-400">{formatKlaava(player.amount)} bet</p>
              {canSplit && (
                <button
                  onClick={() => call(split, player.playerId)}
                  className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs px-3 py-1.5 rounded ml-auto"
                >
                  Split
                </button>
              )}
            </div>

            <HandRow
              label={player.splitHand ? 'A' : null}
              cards={player.hand}
              total={player.total}
              status={player.status}
              result={player.result}
              amount={player.amount}
              powerupTriggered={player.powerupTriggered}
              onHit={() => call(hit, player.playerId, 'main')}
              onStand={() => call(stand, player.playerId, 'main')}
              onDouble={() => call(doubleDown, player.playerId, 'main')}
            />

            {player.splitHand && (
              <HandRow
                label="B"
                cards={player.splitHand}
                total={player.splitTotal}
                status={player.splitStatus}
                result={player.splitResult}
                amount={player.splitAmount}
                powerupTriggered={null}
                onHit={() => call(hit, player.playerId, 'split')}
                onStand={() => call(stand, player.playerId, 'split')}
                onDouble={() => call(doubleDown, player.playerId, 'split')}
              />
            )}
          </div>
        )
      })}

      <div className="flex gap-2 mt-2">
        {allDone && bjState.status === 'playing' && (
          <button onClick={handleDealer} className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded">
            Dealer plays
          </button>
        )}
        {bjState.status === 'finished' && (
          <button onClick={handleReset} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded">
            New round
          </button>
        )}
      </div>

    </div>
  )
}

export default BlackjackControl
