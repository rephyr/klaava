import { useEffect, useState } from 'react'
import { getPowerups, buyPowerup } from '../../../services/shopService'
import { getSession } from '../../../services/gameService'
import { formatKlaava } from '../../../utils/formatters'

function ShopView({ gameState }) {
  const [powerups, setPowerups] = useState([])
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    getPowerups().then(setPowerups)
    getSession().then((s) => setPlayers(s.players))
  }, [])

  async function handleBuy(playerId, powerupId) {
    try {
      const res = await buyPowerup(playerId, powerupId)
      setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, ...res.player } : p))
      setFeedback(`${res.player.name} bought ${powerupId}`)
      setSelected(null)
    } catch {
      setFeedback('Purchase failed')
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Shop</p>
        <p className="text-3xl font-bold">Buy Powerups</p>
      </div>

      {feedback && (
        <p className="text-green-400 text-sm">{feedback}</p>
      )}

      <div className="grid grid-cols-2 gap-4 w-full">
        {powerups.map((powerup) => (
          <div
            key={powerup.id}
            onClick={() => setSelected(selected?.id === powerup.id ? null : powerup)}
            className={`bg-gray-800 rounded-2xl p-5 cursor-pointer border-2 transition-colors ${
              selected?.id === powerup.id ? 'border-indigo-500' : 'border-transparent hover:border-gray-600'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-bold text-lg">{powerup.name}</p>
              <p className="text-yellow-400 font-semibold">{formatKlaava(powerup.cost)}</p>
            </div>
            <p className="text-gray-400 text-sm">{powerup.description}</p>

            {selected?.id === powerup.id && (
              <div className="mt-4 flex flex-wrap gap-2">
                {players.filter((p) => !p.eliminated && !p.powerup && p.klaava >= powerup.cost).map((player) => (
                  <button
                    key={player.id}
                    onClick={(e) => { e.stopPropagation(); handleBuy(player.id, powerup.id) }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded"
                  >
                    {player.name} ({formatKlaava(player.klaava)})
                  </button>
                ))}
                {players.filter((p) => !p.eliminated && !p.powerup && p.klaava >= powerup.cost).length === 0 && (
                  <p className="text-gray-500 text-xs">No eligible players</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="w-full">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Active powerups</p>
        <div className="flex gap-3 flex-wrap">
          {players.filter((p) => p.powerup).map((player) => (
            <div key={player.id} className="bg-gray-800 rounded-lg px-4 py-2 text-sm">
              <span className="text-white font-medium">{player.name}</span>
              <span className="text-indigo-400 ml-2">{player.powerup}</span>
            </div>
          ))}
          {players.filter((p) => p.powerup).length === 0 && (
            <p className="text-gray-600 text-sm">No active powerups</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopView
