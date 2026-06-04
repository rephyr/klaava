import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers } from '../../../services/playerService'
import { startGame, stopGame, getGameState } from '../../../services/gameService'
import { formatKlaava } from '../../../utils/formatters'

function LobbyView() {
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState([])
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getPlayers().then((all) => setPlayers(all.filter((p) => !p.eliminated)))
    getGameState().then(setGameState)
  }, [])

  function togglePlayer(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleStart() {
    if (selected.length < 2) return
    setLoading(true)
    await startGame(selected)
    navigate('/display')
  }

  const gameActive = gameState?.sessionId !== null && gameState?.phase !== 'lobby'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Lobby</h2>
        {gameActive && (
          <span className="text-xs bg-green-900 text-green-400 px-3 py-1 rounded-full">
            Game in progress
          </span>
        )}
      </div>

      {gameActive ? (
        <div className="text-gray-400 text-sm">
          <p className="mb-4">A game is already running.</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/display')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded"
            >
              Go to display
            </button>
            <button
              onClick={async () => { await stopGame(); setGameState({ ...gameState, sessionId: null, phase: 'lobby' }) }}
              className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded"
            >
              Stop game
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-sm mb-4">
            Select players to join the game. Minimum 2.
          </p>
          <div className="flex flex-col gap-2 mb-6 max-w-sm">
            {players.map((player) => (
              <label
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${
                  selected.includes(player.id)
                    ? 'border-indigo-500 bg-indigo-950'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="accent-indigo-500"
                  />
                  <span>{player.name}</span>
                </div>
                <span className="text-green-400 text-sm">{formatKlaava(player.klaava)}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleStart}
            disabled={selected.length < 2 || loading}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-6 py-2 rounded font-semibold"
          >
            {loading ? 'Starting...' : `Start game with ${selected.length} players`}
          </button>
        </>
      )}
    </div>
  )
}

export default LobbyView
