import { useEffect, useState } from 'react'
import { getPlayers, updatePlayer } from '../../../services/playerService'
import { getPowerups, buyPowerup, useItem } from '../../../services/shopService'
import { formatKlaava } from '../../../utils/formatters'

const PASSIVE_ITEMS = ['shield', 'doubleDown', 'immunity', 'jackpot']
const NO_TARGET_ITEMS = ['tax']

function AdminShopView() {
  const [players, setPlayers] = useState([])
  const [powerups, setPowerups] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [using, setUsing] = useState(null)

  useEffect(() => {
    getPlayers().then((all) => setPlayers(all.filter((p) => !p.eliminated)))
    getPowerups().then(setPowerups)
  }, [])

  function showFeedback(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function getPowerupName(id) {
    return powerups.find((p) => p.id === id)?.name ?? id
  }

  async function handleBuy(playerId, powerupId) {
    try {
      const res = await buyPowerup(playerId, powerupId)
      setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, ...res.player } : p))
      showFeedback(`Done`)
    } catch {
      showFeedback('Failed — not enough klaava or already has a powerup')
    }
  }

  async function handleUse(playerId, targetId) {
    try {
      await useItem(playerId, targetId)
      const all = await getPlayers()
      setPlayers(all.filter((p) => !p.eliminated))
      showFeedback('Used!')
    } catch {
      showFeedback('Failed')
    }
    setUsing(null)
  }

  async function handleClear(playerId) {
    const res = await updatePlayer(playerId, { powerup: null })
    setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, powerup: res.powerup } : p))
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
            <th className="pb-2">Held item</th>
            <th className="pb-2">Buy</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <>
              <tr key={player.id} className="border-b border-gray-800">
                <td className="py-3 pr-4 font-medium">{player.name}</td>
                <td className="py-3 pr-4 text-green-400">{formatKlaava(player.klaava)}</td>
                <td className="py-3 pr-4">
                  {player.powerup ? (
                    <div className="flex items-center gap-2">
                      <span className={`${PASSIVE_ITEMS.includes(player.powerup) ? 'text-yellow-400' : 'text-indigo-400'}`}>
                        {getPowerupName(player.powerup)}
                        {PASSIVE_ITEMS.includes(player.powerup) && (
                          <span className="text-xs text-gray-500 ml-1">(auto)</span>
                        )}
                      </span>
                      {!PASSIVE_ITEMS.includes(player.powerup) && (
                        <button
                          onClick={() => {
                            if (NO_TARGET_ITEMS.includes(player.powerup)) {
                              handleUse(player.id, null)
                            } else {
                              setUsing(using?.playerId === player.id ? null : { playerId: player.id })
                            }
                          }}
                          className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-0.5 rounded"
                        >
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => handleClear(player.id)}
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
              {using?.playerId === player.id && (
                <tr key={`${player.id}-use`} className="border-b border-gray-800 bg-gray-900">
                  <td colSpan={4} className="py-2 px-2">
                    <p className="text-xs text-gray-400 mb-2">Pick target for {getPowerupName(player.powerup)}:</p>
                    <div className="flex gap-2 flex-wrap">
                      {players.filter((p) => p.id !== player.id).map((target) => (
                        <button
                          key={target.id}
                          onClick={() => handleUse(player.id, target.id)}
                          className="bg-red-800 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded"
                        >
                          {target.name} ({formatKlaava(target.klaava)})
                        </button>
                      ))}
                      <button
                        onClick={() => setUsing(null)}
                        className="text-gray-400 hover:text-white text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Available items</p>
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
