import { useState } from 'react'
import { playDoubleOrNothing, playLastRoll } from '../../../services/minigameService'
import { formatKlaava } from '../../../utils/formatters'

function MinigameControl({ players, gameState, refreshPlayers }) {
  const [donSelected, setDonSelected] = useState([])
  const [donAmount, setDonAmount] = useState(gameState?.minBet ?? 50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  function toggleDon(id) {
    setDonSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleDoubleOrNothing() {
    if (donSelected.length === 0) return
    setLoading(true)
    try {
      const res = await playDoubleOrNothing(donSelected, donAmount)
      setResult({ type: 'doubleOrNothing', ...res })
      refreshPlayers()
    } finally {
      setLoading(false)
    }
  }

  async function handleLastRoll() {
    setLoading(true)
    try {
      const res = await playLastRoll()
      setResult({ type: 'lastRoll', ...res })
      refreshPlayers()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">

      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Double or Nothing</p>
        <div className="flex gap-6 items-start flex-wrap">
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                  donSelected.includes(p.id)
                    ? 'border-indigo-500 bg-indigo-950'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={donSelected.includes(p.id)}
                  onChange={() => toggleDon(p.id)}
                  className="accent-indigo-500"
                />
                <span className="text-sm">{p.name}</span>
                <span className="text-xs text-green-400">{formatKlaava(p.klaava)}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Amount per player</p>
              <input
                type="number"
                value={donAmount}
                onChange={(e) => setDonAmount(Number(e.target.value))}
                className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-28"
              />
            </div>
            <button
              onClick={handleDoubleOrNothing}
              disabled={donSelected.length === 0 || loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-semibold"
            >
              Flip ({donSelected.length} players)
            </button>
          </div>
        </div>
      </section>

      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Last Roll</p>
        <p className="text-gray-400 text-sm mb-3">
          All active players roll a die. Lowest loses{' '}
          <span className="text-white">{formatKlaava(gameState?.minBet ?? 0)}</span> to the highest.
        </p>
        <button
          onClick={handleLastRoll}
          disabled={loading || players.length < 2}
          className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-semibold"
        >
          Roll for all
        </button>
      </section>

      {result && (
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Result</p>
          {result.type === 'doubleOrNothing' && (
            <div className="flex gap-3 flex-wrap">
              {result.results.map((r) => {
                const blocked = ['shield', 'immunity'].includes(r.powerupTriggered)
                return (
                  <div
                    key={r.playerId}
                    className={`rounded-xl px-5 py-3 text-sm ${
                      r.result === 'win' ? 'bg-green-900'
                      : blocked ? 'bg-blue-900'
                      : 'bg-red-900'
                    }`}
                  >
                    <p className="font-semibold">{r.name}</p>
                    {blocked ? (
                      <p className="font-bold text-lg text-blue-300 uppercase">{r.powerupTriggered}</p>
                    ) : (
                      <p className={`font-bold text-lg ${r.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                        {r.result === 'win' ? '+' : '-'}{formatKlaava(r.amount)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{formatKlaava(r.klaava)} total</p>
                  </div>
                )
              })}
            </div>
          )}
          {result.type === 'lastRoll' && (
            <div className="flex gap-3 flex-wrap">
              {result.results.map((r) => {
                const blocked = ['shield', 'immunity'].includes(r.powerupTriggered)
                return (
                  <div
                    key={r.playerId}
                    className={`rounded-xl px-5 py-3 text-center ${
                      r.outcome === 'winner' ? 'bg-green-900'
                      : blocked ? 'bg-blue-900'
                      : r.outcome === 'loser' ? 'bg-red-900'
                      : 'bg-gray-800'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">{r.name}</p>
                    <p className="text-4xl font-bold">{r.roll}</p>
                    <p className={`text-xs mt-1 capitalize ${
                      r.outcome === 'winner' ? 'text-green-400'
                      : blocked ? 'text-blue-300'
                      : r.outcome === 'loser' ? 'text-red-400'
                      : r.outcome === 'tie' ? 'text-gray-400'
                      : 'text-gray-500'
                    }`}>{blocked ? r.powerupTriggered : r.outcome}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

    </div>
  )
}

export default MinigameControl
