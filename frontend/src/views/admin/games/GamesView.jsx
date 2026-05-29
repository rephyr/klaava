import { useEffect, useState } from 'react'
import { getGames, createGame, deleteGame, toggleGame } from '../../../services/gamesService'

function GamesView() {
  const [games, setGames] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    getGames().then(setGames)
  }, [])

  async function handleCreate() {
    if (!name.trim()) return
    const game = await createGame({ name: name.trim(), description: description.trim() || null })
    setGames([...games, game])
    setName('')
    setDescription('')
  }

  async function handleDelete(id) {
    await deleteGame(id)
    setGames(games.filter((g) => g.id !== id))
  }

  async function handleToggle(id) {
    const updated = await toggleGame(id)
    setGames(games.map((g) => (g.id === id ? updated : g)))
  }

  const active = games.filter((g) => g.isActive)
  const inactive = games.filter((g) => !g.isActive)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Games</h2>

      <div className="bg-gray-800 rounded-xl p-4 mb-8 flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="gameName" className="text-xs text-gray-400">Name</label>
          <input
            id="gameName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-48"
            placeholder="Game name"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="gameDesc" className="text-xs text-gray-400">Description</label>
          <input
            id="gameDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-64"
            placeholder="optional"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
        >
          Add game
        </button>
      </div>

      {active.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Active — shown on wheel ({active.length})
          </p>
          <div className="flex flex-col gap-2">
            {active.map((game) => (
              <div key={game.id} className="bg-gray-800 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{game.name}</p>
                  {game.description && <p className="text-xs text-gray-400 mt-0.5">{game.description}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggle(game.id)}
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    Disable
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Disabled — hidden from wheel ({inactive.length})
          </p>
          <div className="flex flex-col gap-2">
            {inactive.map((game) => (
              <div key={game.id} className="bg-gray-900 rounded-xl px-4 py-3 flex justify-between items-center opacity-60">
                <div>
                  <p className="font-medium">{game.name}</p>
                  {game.description && <p className="text-xs text-gray-400 mt-0.5">{game.description}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggle(game.id)}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {games.length === 0 && (
        <p className="text-gray-500 text-sm">No games yet. Add one above.</p>
      )}
    </div>
  )
}

export default GamesView
