import { useEffect, useState } from 'react'
import { getBjState } from '../../../services/blackjackService'
import { formatKlaava } from '../../../utils/formatters'

function Card({ card, hidden = false }) {
  if (hidden) {
    return (
      <div className="w-14 h-20 bg-indigo-800 rounded-lg shadow-lg flex items-center justify-center border-2 border-indigo-600">
        <span className="text-indigo-400 text-2xl">?</span>
      </div>
    )
  }
  if (!card) return null
  const color = card.red ? 'text-red-500' : 'text-gray-900'
  return (
    <div className="w-14 h-20 bg-white rounded-lg shadow-lg flex flex-col justify-between p-1.5 select-none">
      <span className={`font-bold text-xs leading-none ${color}`}>{card.label}{card.suit}</span>
      <span className={`font-bold text-center text-lg ${color}`}>{card.suit}</span>
      <span className={`font-bold text-xs leading-none self-end rotate-180 ${color}`}>{card.label}{card.suit}</span>
    </div>
  )
}

function Hand({ cards, hiddenCard, total }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {cards.map((card, i) => <Card key={i} card={card} />)}
        {hiddenCard && <Card hidden />}
      </div>
      <p className="text-sm text-gray-400">{total}</p>
    </div>
  )
}

const RESULT_STYLE = {
  win:       'bg-green-900 text-green-300',
  lose:      'bg-red-900 text-red-300',
  push:      'bg-gray-700 text-gray-300',
  blackjack: 'bg-yellow-900 text-yellow-300',
}

const RESULT_LABEL = {
  win:       'WIN',
  lose:      'LOSE',
  push:      'PUSH',
  blackjack: 'BLACKJACK!',
}

const STATUS_LABEL = {
  active:    '',
  stood:     'STAND',
  bust:      'BUST',
  blackjack: 'BLACKJACK!',
}

function BlackjackView() {
  const [state, setState] = useState(null)

  useEffect(() => {
    getBjState().then(setState)
    const interval = setInterval(() => getBjState().then(setState), 2000)
    return () => clearInterval(interval)
  }, [])

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <p className="text-3xl font-semibold text-gray-400">Blackjack</p>
        <p className="text-gray-600 text-sm">Waiting for admin to deal cards</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Dealer</p>
        <Hand
          cards={state.dealer.hand}
          hiddenCard={state.dealer.hiddenCard}
          total={state.dealer.hiddenCard ? '?' : state.dealer.total}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {state.players.map((player) => (
          <div
            key={player.playerId}
            className={`rounded-2xl p-4 flex flex-col gap-3 ${
              player.result ? RESULT_STYLE[player.result] : 'bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg">{player.playerName}</p>
              <p className="text-sm text-gray-300">{formatKlaava(player.amount)} bet</p>
            </div>
            <Hand cards={player.hand} total={player.total} />
            {player.result ? (
              <p className="text-2xl font-black text-center">{RESULT_LABEL[player.result]}</p>
            ) : player.status !== 'active' && (
              <p className="text-sm font-bold text-center text-gray-300">{STATUS_LABEL[player.status]}</p>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}

export default BlackjackView
