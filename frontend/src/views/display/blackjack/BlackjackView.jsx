import { useEffect, useRef, useState } from 'react'
import { getBjState } from '../../../services/blackjackService'
import { formatKlaava } from '../../../utils/formatters'

function calcTotal(hand) {
  let total = hand.reduce((sum, card) => {
    if (card.label === 'A') return sum + 11
    if (card.value >= 10) return sum + 10
    return sum + card.value
  }, 0)
  let aces = hand.filter((c) => c.label === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function Card({ card, hidden = false }) {
  if (hidden) {
    return (
      <div className="w-20 h-28 bg-indigo-800 rounded-xl shadow-lg flex items-center justify-center border-2 border-indigo-600 flex-shrink-0">
        <span className="text-indigo-400 text-3xl">?</span>
      </div>
    )
  }
  if (!card) return null
  const color = card.red ? 'text-red-500' : 'text-gray-900'
  return (
    <div
      style={{ animation: 'dealCard 0.4s ease-out' }}
      className="w-20 h-28 bg-white rounded-xl shadow-lg flex flex-col justify-between p-2 select-none flex-shrink-0"
    >
      <span className={`font-bold text-sm leading-none ${color}`}>{card.label}{card.suit}</span>
      <span className={`font-bold text-center text-2xl ${color}`}>{card.suit}</span>
      <span className={`font-bold text-sm leading-none self-end rotate-180 ${color}`}>{card.label}{card.suit}</span>
    </div>
  )
}

function Hand({ cards, hiddenCard, total, result, status }) {
  const RESULT_STYLE = {
    win:       'text-green-300',
    lose:      'text-red-300',
    push:      'text-gray-300',
    blackjack: 'text-yellow-300',
  }
  const RESULT_LABEL = {
    win:       'WIN',
    lose:      'LOSE',
    push:      'PUSH',
    blackjack: 'BLACKJACK!',
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {cards.map((card, i) => <Card key={i} card={card} />)}
        {hiddenCard && <Card hidden />}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-400">{hiddenCard ? '?' : total}</p>
        {result && (
          <p
            key={result}
            style={{ animation: 'popIn 0.4s ease-out' }}
            className={`text-xl font-black ${RESULT_STYLE[result]}`}
          >
            {RESULT_LABEL[result]}
          </p>
        )}
        {!result && status === 'bust'  && <p className="text-lg font-bold text-red-400">BUST</p>}
        {!result && status === 'stood' && <p className="text-sm text-gray-500">STAND</p>}
        {!result && status === 'blackjack' && <p className="text-lg font-bold text-yellow-400">BLACKJACK!</p>}
      </div>
    </div>
  )
}

const PLAYER_BG = {
  win:       'bg-green-900',
  lose:      'bg-red-900',
  push:      'bg-gray-700',
  blackjack: 'bg-yellow-900',
}

function BlackjackView() {
  const [state, setState]                   = useState(null)
  const [visibleDealerCards, setVisible]    = useState([])
  const [dealerDone, setDealerDone]         = useState(false)
  const prevDealerCountRef                  = useRef(0)
  const timeoutsRef                         = useRef([])

  useEffect(() => {
    getBjState().then(setState)
    const interval = setInterval(() => getBjState().then(setState), 2000)
    return () => clearInterval(interval)
  }, [])

  // Dealer card-by-card reveal
  useEffect(() => {
    if (!state?.dealer?.hand) return
    const hand = state.dealer.hand

    // Clear any pending timeouts from previous reveal
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    if (state.status !== 'finished') {
      setVisible(hand)
      setDealerDone(false)
      prevDealerCountRef.current = hand.length
      return
    }

    const prevCount = prevDealerCountRef.current
    if (hand.length > prevCount) {
      for (let i = prevCount; i < hand.length; i++) {
        const slice = hand.slice(0, i + 1)
        const t = setTimeout(() => setVisible(slice), (i - prevCount) * 650)
        timeoutsRef.current.push(t)
      }
      const doneDelay = (hand.length - prevCount) * 650 + 300
      const t = setTimeout(() => setDealerDone(true), doneDelay)
      timeoutsRef.current.push(t)
    } else {
      setDealerDone(true)
    }
    prevDealerCountRef.current = hand.length
  }, [state?.dealer?.hand?.length, state?.status])

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <p className="text-3xl font-semibold text-gray-400">Blackjack</p>
        <p className="text-gray-600 text-sm">Waiting for admin to deal cards</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-5xl mx-auto">

      {/* Dealer */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Dealer</p>
        <Hand
          cards={visibleDealerCards}
          hiddenCard={state.dealer.hiddenCard}
          total={state.dealer.hiddenCard ? '?' : calcTotal(visibleDealerCards)}
        />
      </div>

      {/* Players — side by side */}
      <div className="flex gap-5 flex-wrap justify-center w-full">
        {state.players.map((player, pi) => {
          const hasSplit   = player.splitHand != null
          const mainBg     = dealerDone && player.result ? PLAYER_BG[player.result] : 'bg-gray-800'
          const splitBg    = dealerDone && player.splitResult ? PLAYER_BG[player.splitResult] : 'bg-gray-700'

          return (
            <div
              key={player.playerId}
              style={{ animation: `fadeUp 0.35s ease-out ${pi * 0.08}s both` }}
              className={`rounded-2xl p-5 flex flex-col gap-4 min-w-56 ${hasSplit ? 'bg-gray-800' : mainBg}`}
            >
              <div className="flex justify-between items-center">
                <p className="font-bold text-lg">{player.playerName}</p>
                <p className="text-sm text-gray-300">{formatKlaava(player.amount)}</p>
              </div>

              {hasSplit ? (
                <div className="flex gap-4">
                  <div className={`rounded-xl p-3 flex flex-col items-center gap-2 flex-1 ${mainBg}`}>
                    <p className="text-xs text-gray-400">Hand A</p>
                    <Hand cards={player.hand} total={player.total} result={dealerDone ? player.result : null} status={player.status} />
                  </div>
                  <div className={`rounded-xl p-3 flex flex-col items-center gap-2 flex-1 ${splitBg}`}>
                    <p className="text-xs text-gray-400">Hand B · {formatKlaava(player.splitAmount)}</p>
                    <Hand cards={player.splitHand} total={player.splitTotal} result={dealerDone ? player.splitResult : null} status={player.splitStatus} />
                  </div>
                </div>
              ) : (
                <Hand cards={player.hand} total={player.total} result={dealerDone ? player.result : null} status={player.status} />
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default BlackjackView
