import { useState } from 'react'
import { transferKlaava } from '../../../services/gameService'
import { formatKlaava } from '../../../utils/formatters'

function KlaavaTransfer({ players, setPlayers, gameState }) {
  const [winner, setWinner] = useState('')
  const [loser, setLoser] = useState('')
  const [amount, setAmount] = useState('')
  const [feedback, setFeedback] = useState(null)

  async function handleTransfer() {
    if (!winner || !loser || !amount || winner === loser) return
    try {
      const result = await transferKlaava(Number(loser), Number(winner), Number(amount))
      setPlayers((prev) =>
        prev
          .map((p) => {
            if (p.id === result.winner.id) return { ...p, klaava: result.winner.klaava, eliminated: result.winner.eliminated }
            if (p.id === result.loser.id) return { ...p, klaava: result.loser.klaava, eliminated: result.loser.eliminated }
            return p
          })
          .filter((p) => !p.eliminated)
      )
      setFeedback(`${result.loser.name} paid ${formatKlaava(result.amount)} to ${result.winner.name}`)
      setWinner('')
      setLoser('')
      setAmount('')
    } catch {
      setFeedback('Transfer failed')
    }
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div className="flex flex-col gap-4">
      {feedback && <p className="text-green-400 text-sm">{feedback}</p>}

      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Loser (pays)</label>
          <select
            value={loser}
            onChange={(e) => setLoser(e.target.value)}
            className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({formatKlaava(p.klaava)})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Winner (receives)</label>
          <select
            value={winner}
            onChange={(e) => setWinner(e.target.value)}
            className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({formatKlaava(p.klaava)})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${gameState.minBet} – ${gameState.maxBet}`}
            className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-32"
          />
        </div>
        <button
          onClick={handleTransfer}
          disabled={!winner || !loser || !amount || winner === loser}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
        >
          Transfer
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {players.map((p) => (
          <div key={p.id} className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
            <span className="text-white">{p.name}</span>
            <span className="text-green-400 ml-2">{formatKlaava(p.klaava)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KlaavaTransfer
