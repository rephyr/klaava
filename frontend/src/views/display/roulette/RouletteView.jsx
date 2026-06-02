import { useEffect, useState } from 'react'
import { getRouletteState } from '../../../services/rouletteService'
import { formatKlaava } from '../../../utils/formatters'

const NUMBER_COLOR = {
  red:   'text-red-500',
  black: 'text-white',
  green: 'text-green-400',
}

const NUMBER_BG = {
  red:   'bg-red-950 border-red-700',
  black: 'bg-gray-800 border-gray-600',
  green: 'bg-green-950 border-green-700',
}

function betLabel(bet) {
  if (bet.betType === 'color') return bet.betValue
  if (bet.betType === 'parity') return bet.betValue
  return `#${bet.betValue}`
}

function RouletteView() {
  const [state, setState] = useState(null)

  useEffect(() => {
    getRouletteState().then(setState)
    const interval = setInterval(() => getRouletteState().then(setState), 2000)
    return () => clearInterval(interval)
  }, [])

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <p className="text-3xl font-semibold text-gray-400">Roulette</p>
        <p className="text-gray-600 text-sm">Waiting for admin to start betting</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      <p className="text-gray-400 text-sm uppercase tracking-widest">Roulette</p>

      {state.status === 'finished' && (
        <div className={`rounded-3xl border-2 px-16 py-8 flex flex-col items-center gap-2 ${NUMBER_BG[state.resultColor]}`}>
          <p className={`text-8xl font-black ${NUMBER_COLOR[state.resultColor]}`}>
            {state.result}
          </p>
          <p className={`text-xl font-semibold capitalize ${NUMBER_COLOR[state.resultColor]}`}>
            {state.resultColor}
            {state.result !== 0 && (
              <span className="text-gray-400 font-normal text-base ml-3">
                · {state.result % 2 === 0 ? 'even' : 'odd'}
              </span>
            )}
          </p>
        </div>
      )}

      {state.status === 'betting' && (
        <p className="text-lg text-yellow-400 font-semibold animate-pulse">Place your bets</p>
      )}

      {state.bets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 w-full">
          {state.bets.map((bet) => (
            <div
              key={bet.playerId}
              className={`rounded-2xl p-4 flex flex-col gap-1 ${
                bet.result === 'win' ? 'bg-green-900' : bet.result === 'lose' ? 'bg-red-900' : 'bg-gray-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-lg font-bold">{bet.playerName}</p>
                <p className="text-sm text-gray-300 capitalize font-medium">{betLabel(bet)}</p>
              </div>
              <p className="text-sm text-gray-400">{formatKlaava(bet.amount)} bet</p>
              {bet.result && (
                <p className={`text-2xl font-black mt-1 ${bet.result === 'win' ? 'text-green-300' : 'text-red-300'}`}>
                  {bet.result === 'win' ? `WIN +${formatKlaava(bet.payout)}` : `LOSE -${formatKlaava(bet.amount)}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RouletteView
