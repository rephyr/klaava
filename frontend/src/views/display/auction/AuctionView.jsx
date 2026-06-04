import { useEffect, useState } from 'react'
import { getAuctionState } from '../../../services/auctionService'
import { formatKlaava } from '../../../utils/formatters'

function AuctionView() {
  const [state, setState] = useState(null)

  useEffect(() => {
    getAuctionState().then(setState)
    const interval = setInterval(() => getAuctionState().then(setState), 2000)
    return () => clearInterval(interval)
  }, [])

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <p className="text-3xl font-bold text-gray-300">Auction</p>
        <p className="text-gray-500 text-sm">Waiting for auction to start...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Auction</p>
        <p className="text-4xl font-bold">{state.item?.name}</p>
        <p className="text-gray-400 text-sm mt-2">{state.item?.description}</p>
      </div>

      {state.status === 'finished' && state.winner ? (
        <div className="bg-yellow-900 rounded-2xl p-8 text-center w-full">
          <p className="text-yellow-300 text-xl font-bold mb-2">{state.winner.playerName} wins!</p>
          <p className="text-3xl font-black text-yellow-400">{state.winner.item?.name}</p>
          <p className="text-gray-400 mt-3">Paid {formatKlaava(state.winner.amount)}</p>
        </div>
      ) : (
        <div className="w-full">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            {state.status === 'open' ? 'Live bids' : 'No bids'}
          </p>
          {state.bids.length === 0 ? (
            <p className="text-gray-600 text-sm">No bids yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {state.bids.map((bid, i) => (
                <div
                  key={bid.playerId}
                  className={`rounded-xl px-5 py-3 flex justify-between items-center ${
                    i === 0 ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  <span className="font-semibold text-lg">{bid.playerName}</span>
                  <span className={`text-2xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {formatKlaava(bid.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AuctionView
