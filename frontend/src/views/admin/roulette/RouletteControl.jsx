import { useEffect, useState } from 'react'
import { startRoulette, spin, resetRoulette, placeBet, getRouletteState } from '../../../services/rouletteService'
import { formatKlaava } from '../../../utils/formatters'

const COLOR_STYLE = {
  red:   'bg-red-600 text-white',
  black: 'bg-gray-900 text-white ring-1 ring-gray-500',
  green: 'bg-green-600 text-white',
}

const RESULT_NUMBER_COLOR = {
  red:   'text-red-500',
  black: 'text-white',
  green: 'text-green-400',
}

function RouletteControl({ players, gameState, onPhaseChange, refreshPlayers }) {
  const [state, setState] = useState(null)
  const [bets, setBets] = useState({})

  useEffect(() => {
    getRouletteState().then(setState)
  }, [])

  function defaultBet() {
    return { betType: 'color', betValue: 'red', amount: gameState.minBet }
  }

  function getBet(playerId) {
    return bets[playerId] ?? defaultBet()
  }

  async function sendBet(playerId, playerName, bet) {
    await placeBet(playerId, playerName, bet.betType, bet.betValue, bet.amount)
  }

  function updateBet(playerId, playerName, changes) {
    const current = getBet(playerId)
    const updated = { ...current, ...changes }
    if (changes.betType) {
      updated.betValue = changes.betType === 'color' ? 'red' : changes.betType === 'parity' ? 'odd' : '0'
    }
    setBets((prev) => ({ ...prev, [playerId]: updated }))
    sendBet(playerId, playerName, updated)
  }

  async function handleStart() {
    const s = await startRoulette()
    setState(s)
    setBets({})
    onPhaseChange('roulette')
  }

  async function handleSpin() {
    const s = await spin()
    setState(s)
    refreshPlayers()
  }

  async function handleReset() {
    const s = await resetRoulette()
    setState(s)
    setBets({})
  }

  if (!state || state.status === 'idle') {
    return (
      <button
        onClick={handleStart}
        className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded"
      >
        Start betting
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {state.status === 'finished' && (
        <div className="bg-gray-800 rounded-xl px-5 py-3 flex items-center gap-4">
          <span className="text-gray-400 text-sm">Result:</span>
          <span className={`text-4xl font-black ${RESULT_NUMBER_COLOR[state.resultColor]}`}>
            {state.result}
          </span>
          <span className={`text-sm font-semibold capitalize ${RESULT_NUMBER_COLOR[state.resultColor]}`}>
            {state.resultColor}
          </span>
          {state.result !== 0 && (
            <span className="text-sm text-gray-400">
              {state.result % 2 === 0 ? 'even' : 'odd'}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const bet = getBet(player.id)
          const betResult = state.bets.find((b) => b.playerId === player.id)

          return (
            <div key={player.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <p className="w-24 font-medium text-sm">{player.name}</p>
              <p className="text-green-400 text-sm w-20">{formatKlaava(player.klaava)}</p>

              {state.status === 'betting' && (
                <>
                  <div className="flex gap-1">
                    {['color', 'parity', 'number'].map((type) => (
                      <button
                        key={type}
                        onClick={() => updateBet(player.id, player.name, { betType: type })}
                        className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                          bet.betType === type ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {bet.betType === 'color' && (
                    <div className="flex gap-1">
                      {['red', 'black', 'green'].map((c) => (
                        <button
                          key={c}
                          onClick={() => updateBet(player.id, player.name, { betValue: c })}
                          className={`px-3 py-1 rounded text-xs capitalize font-semibold transition-colors ${
                            bet.betValue === c ? COLOR_STYLE[c] : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}

                  {bet.betType === 'parity' && (
                    <div className="flex gap-1">
                      {['odd', 'even'].map((p) => (
                        <button
                          key={p}
                          onClick={() => updateBet(player.id, player.name, { betValue: p })}
                          className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                            bet.betValue === p ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}

                  {bet.betType === 'number' && (
                    <input
                      type="number"
                      min={0}
                      max={36}
                      value={bet.betValue}
                      onChange={(e) => updateBet(player.id, player.name, { betValue: e.target.value })}
                      className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-16"
                    />
                  )}

                  <input
                    type="number"
                    value={bet.amount}
                    onChange={(e) => updateBet(player.id, player.name, { amount: Number(e.target.value) })}
                    className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-20"
                  />
                </>
              )}

              {betResult?.result && (() => {
                const blocked = ['shield', 'immunity'].includes(betResult.powerupTriggered)
                const boostLabel = betResult.powerupTriggered === 'jackpot' ? ' JACKPOT!' : betResult.powerupTriggered === 'doubleDown' ? ' DD!' : ''
                return (
                  <span className={`text-sm font-bold ml-auto ${
                    blocked ? 'text-blue-300'
                    : betResult.result === 'win' ? 'text-green-400'
                    : 'text-red-400'
                  }`}>
                    {blocked && betResult.powerupTriggered.toUpperCase()}
                    {!blocked && betResult.result === 'win' && `WIN +${formatKlaava(betResult.payout)}${boostLabel}`}
                    {!blocked && betResult.result === 'lose' && `LOSE -${formatKlaava(betResult.amount)}`}
                  </span>
                )
              })()}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 mt-1">
        {state.status === 'betting' && (
          <button
            onClick={handleSpin}
            className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded"
          >
            Spin
          </button>
        )}
        {state.status === 'finished' && (
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

export default RouletteControl
