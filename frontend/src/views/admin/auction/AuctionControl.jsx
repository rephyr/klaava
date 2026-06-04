import { useEffect, useState } from 'react'
import { getAuctionItems, getAuctionState, startAuction, placeBid, endAuction, resetAuction } from '../../../services/auctionService'
import { formatKlaava } from '../../../utils/formatters'

function AuctionControl({ players, gameState, onPhaseChange, refreshPlayers }) {
  const [items, setItems] = useState([])
  const [state, setState] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [bidAmounts, setBidAmounts] = useState({})

  useEffect(() => {
    getAuctionItems().then(setItems)
    getAuctionState().then(setState)
  }, [])

  function getBidAmount(playerId) {
    return bidAmounts[playerId] ?? (gameState?.minBet ?? 10)
  }

  async function handleStart() {
    if (!selectedItem) return
    const s = await startAuction(selectedItem)
    setState(s)
    setBidAmounts({})
    onPhaseChange('auction')
  }

  async function handleBid(playerId, amount) {
    try {
      const s = await placeBid(playerId, amount)
      setState(s)
    } catch {}
  }

  async function handleEnd() {
    try {
      const s = await endAuction()
      setState(s)
      refreshPlayers()
    } catch {}
  }

  async function handleReset() {
    const s = await resetAuction()
    setState(s)
    setBidAmounts({})
    setSelectedItem(null)
  }

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Select item to auction</p>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item.id)}
              className={`rounded-xl p-4 text-left transition-colors ${
                selectedItem === item.id ? 'bg-yellow-800 ring-1 ring-yellow-500' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
            </button>
          ))}
        </div>
        <button
          onClick={handleStart}
          disabled={!selectedItem}
          className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded w-fit"
        >
          Start auction
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Item up for auction</p>
        <p className="font-bold text-lg">{state.item?.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{state.item?.description}</p>
      </div>

      {state.status === 'finished' && state.winner && (
        <div className="bg-yellow-900/50 border border-yellow-700 rounded-xl p-4">
          <p className="font-bold text-yellow-300">{state.winner.playerName} wins the {state.winner.item?.name}!</p>
          <p className="text-sm text-gray-400 mt-1">Paid {formatKlaava(state.winner.amount)}</p>
        </div>
      )}

      {state.status === 'open' && (
        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const myBid = state.bids.find((b) => b.playerId === player.id)?.amount
            return (
              <div key={player.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <p className="w-24 text-sm font-medium">{player.name}</p>
                <p className="text-green-400 text-sm w-20">{formatKlaava(player.klaava)}</p>
                {myBid != null && (
                  <p className="text-yellow-400 text-xs w-24">bid: {formatKlaava(myBid)}</p>
                )}
                <input
                  type="number"
                  value={getBidAmount(player.id)}
                  onChange={(e) => setBidAmounts((prev) => ({ ...prev, [player.id]: Number(e.target.value) }))}
                  className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-24 ml-auto"
                />
                <button
                  onClick={() => handleBid(player.id, getBidAmount(player.id))}
                  className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs px-3 py-1.5 rounded"
                >
                  Bid
                </button>
              </div>
            )
          })}
        </div>
      )}

      {state.bids.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Current bids</p>
          {state.bids.map((bid, i) => (
            <div
              key={bid.playerId}
              className={`flex justify-between text-sm py-1 ${i === 0 ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}
            >
              <span>{bid.playerName}</span>
              <span>{formatKlaava(bid.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {state.status === 'open' && (
          <button
            onClick={handleEnd}
            className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
          >
            End auction
          </button>
        )}
        <button
          onClick={handleReset}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded"
        >
          {state.status === 'finished' ? 'New auction' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

export default AuctionControl
