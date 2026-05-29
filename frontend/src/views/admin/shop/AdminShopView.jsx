import { useEffect, useState } from 'react'
import { getPlayers } from '../../../services/playerService'
import { getPowerups, buyPowerup } from '../../../services/shopService'
import { formatKlaava } from '../../../utils/formatters'

function AdminShopView() {
  const [players, setPlayers] = useState([])
  const [powerups, setPowerups] = useState([])
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    getPlayers().then((all) => setPlayers(all.filter((p) => !p.eliminated)))
    getPowerups().then(setPowerups)
  }, [])

  async function handleBuy(playerId, powerupId) {
    try {
      const res = await buyPowerup(playerId, powerupId)
      setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, ...res.player } : p))
      setFeedback(`Done`)
    } catch {
      setFeedback('Failed — not enough klaava or already has a powerup')
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  async function clearPowerup(playerId) {
    const res = await fetch(`/api/players/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ powerup: null }),
    })
    const updated = await res.json()
    setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, powerup: updated.powerup } : p))
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Shop</h2>

      {feedback && <p className="text-sm text-green-400 mb-4">{feedback}</p>}

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="pb-2">Player</th>
            <th className="pb-2">Klaava</th>
            <th className="pb-2">Active powerup</th>
            <th className="pb-2">Buy</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-b border-gray-800">
              <td className="py-3 pr-4 font-medium">{player.name}</td>
              <td className="py-3 pr-4 text-green-400">{formatKlaava(player.klaava)}</td>
              <td className="py-3 pr-4">
                {player.powerup ? (
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400">{player.powerup}</span>
                    <button
                      onClick={() => clearPowerup(player.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      clear
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-600">none</span>
                )}
              </td>
              <td className="py-3">
                {!player.powerup && (
                  <div className="flex gap-2 flex-wrap">
                    {powerups.filter((pw) => player.klaava >= pw.cost).map((pw) => (
                      <button
                        key={pw.id}
                        onClick={() => handleBuy(player.id, pw.id)}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded"
                      >
                        {pw.name} ({formatKlaava(pw.cost)})
                      </button>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Available powerups</p>
        <div className="grid grid-cols-2 gap-3">
          {powerups.map((pw) => (
            <div key={pw.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between mb-1">
                <p className="font-semibold">{pw.name}</p>
                <p className="text-yellow-400 text-sm">{formatKlaava(pw.cost)}</p>
              </div>
              <p className="text-gray-400 text-xs">{pw.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminShopView
