import { useEffect, useState } from 'react'
import { getHiLoState } from '../../../services/hiLoService'

function Card({ card, large = false }) {
  if (!card) return null
  const size = large ? 'w-40 h-56' : 'w-28 h-40'
  const textSize = large ? 'text-6xl' : 'text-4xl'
  const labelSize = 'text-2xl'
  const color = card.red ? 'text-red-500' : 'text-gray-900'
  return (
    <div style={{ perspective: '600px' }}>
      <div
        style={{ animation: 'dealCard 0.5s ease-out' }}
        className={`${size} bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-3 select-none`}
      >
        <span className={`font-bold leading-none ${color} ${labelSize}`}>{card.label}{card.suit}</span>
        <span className={`font-bold text-center ${color} ${textSize}`}>{card.suit}</span>
        <span className={`font-bold leading-none self-end rotate-180 ${color} ${labelSize}`}>{card.label}{card.suit}</span>
      </div>
    </div>
  )
}

function HiLoView() {
  const [state, setState] = useState(null)

  useEffect(() => {
    getHiLoState().then(setState)
    const interval = setInterval(() => getHiLoState().then(setState), 2000)
    return () => clearInterval(interval)
  }, [])

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-3xl font-semibold text-gray-400">Hi-Lo</p>
        <p className="text-gray-600 text-sm">Waiting for admin to start the round</p>
      </div>
    )
  }

  const resultColor = state.result === 'higher' ? 'text-green-400' : state.result === 'lower' ? 'text-red-400' : 'text-yellow-400'
  const resultLabel = state.result === 'higher' ? 'Higher!' : state.result === 'lower' ? 'Lower!' : 'Equal!'

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8">
      <p className="text-gray-400 text-sm uppercase tracking-widest">Hi-Lo</p>

      <div className="flex items-center gap-12">
        {state.status === 'revealed' && state.previousCard && (
          <div
            key={`prev-${state.previousCard.label}${state.previousCard.suit}`}
            style={{ animation: 'slideInLeft 0.4s ease-out' }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-xs text-gray-500 uppercase tracking-widest">Previous</p>
            <Card card={state.previousCard} />
          </div>
        )}

        {state.status === 'revealed' && state.result && (
          <p
            key={state.result}
            style={{ animation: 'popIn 0.4s ease-out' }}
            className={`text-5xl font-bold ${resultColor}`}
          >
            {resultLabel}
          </p>
        )}

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            {state.status === 'revealed' ? 'New card' : 'Current card'}
          </p>
          <Card
            key={`${state.currentCard?.label}${state.currentCard?.suit}`}
            card={state.currentCard}
            large
          />
        </div>
      </div>

      {state.status === 'waiting' && (
        <div className="flex gap-16 mt-2">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">⬆</span>
            <span className="text-xl font-semibold text-green-400">Higher</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">⬇</span>
            <span className="text-xl font-semibold text-red-400">Lower</span>
          </div>
        </div>
      )}

      {state.status === 'revealed' && state.bets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mt-2">
          {state.bets.map((bet, i) => (
            <div
              key={bet.playerId}
              style={{ animation: `fadeUp 0.35s ease-out ${i * 0.07}s both` }}
              className={`rounded-2xl p-4 flex flex-col gap-1 ${
                bet.result === 'correct' ? 'bg-green-900' : bet.result === 'wrong' ? 'bg-red-900' : 'bg-gray-800'
              }`}
            >
              <p className="text-lg font-bold">{bet.playerName}</p>
              <p className="text-sm text-gray-300 capitalize">{bet.guess === 'higher' ? '⬆ Higher' : '⬇ Lower'}</p>
              {bet.result && (
                <p className={`text-2xl font-black ${bet.result === 'correct' ? 'text-green-300' : 'text-red-300'}`}>
                  {bet.result === 'correct' ? `CORRECT +${bet.amount} kl` : `WRONG -${bet.amount} kl`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-600 text-sm">{state.deck?.length ?? 0} cards remaining</p>
    </div>
  )
}

export default HiLoView
