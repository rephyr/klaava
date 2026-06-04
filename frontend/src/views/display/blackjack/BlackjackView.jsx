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

// Both Card and EmptySlot are exactly w-16 h-24 (64×96px) so swapping never shifts layout
function Card({ card, hidden = false }) {
  if (hidden) {
    return (
      <div className="w-16 h-24 bg-indigo-800 rounded-xl shadow-lg flex items-center justify-center border-2 border-indigo-600 flex-shrink-0">
        <span className="text-indigo-400 text-2xl">?</span>
      </div>
    )
  }
  if (!card) return null
  const color = card.red ? 'text-red-500' : 'text-gray-900'
  return (
    <div
      style={{ animation: 'dealCard 0.4s ease-out' }}
      className="w-16 h-24 bg-white rounded-xl shadow-lg flex flex-col justify-between p-1.5 select-none flex-shrink-0"
    >
      <span className={`font-bold text-xs leading-none ${color}`}>{card.label}{card.suit}</span>
      <span className={`font-bold text-center text-xl ${color}`}>{card.suit}</span>
      <span className={`font-bold text-xs leading-none self-end rotate-180 ${color}`}>{card.label}{card.suit}</span>
    </div>
  )
}

function EmptySlot() {
  return (
    <div className="w-16 h-24 rounded-xl border-2 border-dashed border-gray-700 bg-transparent flex-shrink-0" />
  )
}

// Fixed-height card row — always occupies h-24 so nothing above/below shifts
function CardRow({ cards, showHidden = false, emptySlots = 0 }) {
  return (
    <div className="flex gap-2 justify-center" style={{ height: '96px', alignItems: 'center' }}>
      {cards.map((c, i) => <Card key={i} card={c} />)}
      {showHidden && <Card hidden />}
      {Array.from({ length: emptySlots }).map((_, i) => <EmptySlot key={i} />)}
    </div>
  )
}

// Fixed-height status line below cards — always 28px tall so nothing shifts
function StatusLine({ total, result, status, dealerDone, dealingDone }) {
  return (
    <div className="flex items-center justify-center gap-2" style={{ height: '28px' }}>
      {total !== null && <p className="text-sm text-gray-400">{total}</p>}
      {dealerDone && result && (
        <p
          key={result}
          style={{ animation: 'popIn 0.4s ease-out' }}
          className={`text-lg font-black ${
            result === 'win' || result === 'blackjack' ? 'text-green-300' :
            result === 'push' ? 'text-gray-300' : 'text-red-300'
          }`}
        >
          {result === 'blackjack' ? 'BLACKJACK!' : result.toUpperCase()}
        </p>
      )}
      {dealingDone && !result && status === 'bust' && <p className="text-red-400 font-bold text-sm">BUST</p>}
      {dealingDone && !result && status === 'stood' && <p className="text-gray-500 text-sm">STAND</p>}
      {dealingDone && !result && status === 'blackjack' && <p className="text-yellow-400 font-bold text-sm">BLACKJACK!</p>}
    </div>
  )
}

const PLAYER_BG = {
  win: 'bg-green-900',
  lose: 'bg-red-900',
  push: 'bg-gray-700',
  blackjack: 'bg-yellow-900',
}

const DEAL_INTERVAL = 380

function BlackjackView({ session }) {
  const [state, setState] = useState(null)
  const [dealtHands, setDealtHands] = useState({})
  const [dealtDealerHand, setDealtDealerHand] = useState([])
  const [dealtDealerHidden, setDealtDealerHidden] = useState(false)
  const [dealingDone, setDealingDone] = useState(false)
  const [visibleDealerCards, setVisibleDealerCards] = useState([])
  const [dealerDone, setDealerDone] = useState(false)

  const prevStatusRef = useRef('idle')
  const prevDealerCountRef = useRef(0)
  const firstStateRef = useRef(true)
  const dealTimeoutsRef = useRef([])
  const dealerTimeoutsRef = useRef([])

  useEffect(() => {
    getBjState().then(setState)
    const interval = setInterval(() => getBjState().then(setState), 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!state) return
    const isFirst = firstStateRef.current
    firstStateRef.current = false
    const prev = prevStatusRef.current
    prevStatusRef.current = state.status

    if (state.status === 'idle') {
      setDealingDone(false)
      setDealtHands({})
      setDealtDealerHand([])
      setDealtDealerHidden(false)
      return
    }

    if (state.status !== 'playing' || prev === 'playing') return

    if (isFirst) {
      setDealingDone(true)
      return
    }

    dealTimeoutsRef.current.forEach(clearTimeout)
    dealTimeoutsRef.current = []
    setDealingDone(false)
    setDealerDone(false)
    prevDealerCountRef.current = 1

    const players = state.players
    const emptyHands = {}
    players.forEach((p) => { emptyHands[p.playerId] = [] })
    setDealtHands(emptyHands)
    setDealtDealerHand([])
    setDealtDealerHidden(false)

    const events = []
    players.forEach((p, i) => events.push({ type: 'player', playerId: p.playerId, playerIdx: i, cardIdx: 0 }))
    events.push({ type: 'dealer' })
    players.forEach((p, i) => events.push({ type: 'player', playerId: p.playerId, playerIdx: i, cardIdx: 1 }))
    events.push({ type: 'dealerHidden' })

    events.forEach((ev, step) => {
      const t = setTimeout(() => {
        if (ev.type === 'player') {
          const card = state.players[ev.playerIdx].hand[ev.cardIdx]
          setDealtHands((prev) => ({ ...prev, [ev.playerId]: [...prev[ev.playerId], card] }))
        } else if (ev.type === 'dealer') {
          setDealtDealerHand([state.dealer.hand[0]])
        } else {
          setDealtDealerHidden(true)
        }
      }, (step + 1) * DEAL_INTERVAL)
      dealTimeoutsRef.current.push(t)
    })

    const doneT = setTimeout(() => setDealingDone(true), (events.length + 1) * DEAL_INTERVAL)
    dealTimeoutsRef.current.push(doneT)
  }, [state?.status])

  useEffect(() => {
    if (!state?.dealer?.hand) return
    const hand = state.dealer.hand
    dealerTimeoutsRef.current.forEach(clearTimeout)
    dealerTimeoutsRef.current = []

    if (state.status !== 'finished') {
      prevDealerCountRef.current = hand.length
      return
    }

    const prevCount = prevDealerCountRef.current
    if (hand.length > prevCount) {
      for (let i = prevCount; i < hand.length; i++) {
        const t = setTimeout(() => setVisibleDealerCards(hand.slice(0, i + 1)), (i - prevCount) * 650)
        dealerTimeoutsRef.current.push(t)
      }
      const t = setTimeout(() => setDealerDone(true), (hand.length - prevCount) * 650 + 300)
      dealerTimeoutsRef.current.push(t)
    } else {
      setVisibleDealerCards(hand)
      setDealerDone(true)
    }
    prevDealerCountRef.current = hand.length
  }, [state?.dealer?.hand?.length, state?.status])

  const seatedPlayers = session?.players?.filter((p) => !p.eliminated) ?? []

  // Idle — seated players with empty slots, same layout dimensions as playing state
  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Dealer</p>
          <CardRow cards={[]} emptySlots={2} />
          <div style={{ height: '28px' }} />
        </div>

        <div className="border-t border-gray-800" />

        <div className="flex gap-4 flex-wrap justify-center pt-6">
          {seatedPlayers.map((p) => (
            <div key={p.id} className="bg-gray-800/60 rounded-2xl px-5 py-4 flex flex-col items-center gap-2 min-w-44">
              <p className="font-bold text-lg">{p.name}</p>
              <p className="text-green-400 text-sm">{formatKlaava(p.klaava)}</p>
              <CardRow cards={[]} emptySlots={2} />
              <div style={{ height: '28px' }} />
            </div>
          ))}
          {seatedPlayers.length === 0 && (
            <p className="text-gray-600 text-sm">Waiting for game to start...</p>
          )}
        </div>
      </div>
    )
  }

  const players = state.players

  let dealerCards, showHidden
  if (state.status === 'finished') {
    dealerCards = visibleDealerCards
    showHidden = false
  } else if (dealingDone) {
    dealerCards = state.dealer.hand
    showHidden = !!state.dealer.hiddenCard
  } else {
    dealerCards = dealtDealerHand
    showHidden = dealtDealerHidden
  }

  const totalDealerSlots = dealerCards.length + (showHidden ? 1 : 0)
  const dealerEmptySlots = Math.max(0, 2 - totalDealerSlots)
  const dealerTotal = !showHidden && dealerCards.length > 0 ? calcTotal(dealerCards) : null

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto">
      {/* Dealer */}
      <div className="flex flex-col items-center gap-2 py-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Dealer</p>
        <CardRow cards={dealerCards} showHidden={showHidden} emptySlots={dealerEmptySlots} />
        <div style={{ height: '28px' }} className="flex items-center">
          {dealerTotal !== null && <p className="text-sm text-gray-400">{dealerTotal}</p>}
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Players */}
      <div className="flex gap-4 flex-wrap justify-center pt-6">
        {players.map((player) => {
          const hand = dealingDone ? player.hand : (dealtHands[player.playerId] ?? [])
          const total = hand.length > 0 ? calcTotal(hand) : null
          const hasSplit = dealingDone && player.splitHand != null
          const mainBg = dealerDone && player.result ? PLAYER_BG[player.result] : 'bg-gray-800'
          const splitBg = dealerDone && player.splitResult ? PLAYER_BG[player.splitResult] : 'bg-gray-700'
          const emptySlots = !dealingDone ? Math.max(0, 2 - hand.length) : 0

          return (
            <div
              key={player.playerId}
              className={`rounded-2xl px-5 py-4 flex flex-col gap-2 min-w-44 ${hasSplit ? 'bg-gray-800' : mainBg}`}
            >
              <div className="flex justify-between items-center gap-3">
                <p className="font-bold text-lg">{player.playerName}</p>
                <p className="text-sm text-gray-300">{formatKlaava(player.amount)}</p>
              </div>

              {hasSplit ? (
                <div className="flex gap-3">
                  {[
                    { cards: player.hand, total: player.total, status: player.status, result: player.result, bg: mainBg, label: 'A' },
                    { cards: player.splitHand, total: player.splitTotal, status: player.splitStatus, result: player.splitResult, bg: splitBg, label: `B · ${formatKlaava(player.splitAmount)}` },
                  ].map(({ cards, total, status, result, bg, label }) => (
                    <div key={label} className={`rounded-xl p-3 flex flex-col items-center gap-1 flex-1 ${bg}`}>
                      <p className="text-xs text-gray-400 mb-1">Hand {label}</p>
                      <CardRow cards={cards} />
                      <StatusLine total={total} result={result} status={status} dealerDone={dealerDone} dealingDone={dealingDone} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <CardRow cards={hand} emptySlots={emptySlots} />
                  <StatusLine total={total} result={player.result} status={player.status} dealerDone={dealerDone} dealingDone={dealingDone} />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BlackjackView
