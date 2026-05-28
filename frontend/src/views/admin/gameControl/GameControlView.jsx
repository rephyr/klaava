import { useEffect, useState } from 'react'
import { getGameState, advanceGame } from '../../../services/gameService'
import { formatKlaava } from '../../../utils/formatters'

const PHASES = ['gambling', 'minigame']

function GameControlView() {
  const [gameState, setGameState] = useState(null)

  useEffect(() => {
    getGameState().then(setGameState)
  }, [])

  async function handleAdvance(data) {
    const updated = await advanceGame(data)
    setGameState((prev) => ({ ...prev, ...updated }))
  }

  if (!gameState?.sessionId) {
    return <p className="text-gray-400 text-sm">No active game session. Start a game from the lobby first.</p>
  }

  const nextMinBet = Math.round(gameState.minBet * gameState.betMultiplier)
  const nextMaxBet = Math.round(gameState.maxBet * gameState.betMultiplier)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Game Control</h2>

      <div className="bg-gray-800 rounded-xl p-4 mb-8 flex gap-8 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-1">Phase</p>
          <p className="capitalize font-semibold">{gameState.phase}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Round</p>
          <p className="font-semibold">{gameState.round}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Level</p>
          <p className="font-semibold">{gameState.level}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Min bet</p>
          <p className="font-semibold text-green-400">{formatKlaava(gameState.minBet)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Max bet</p>
          <p className="font-semibold text-green-400">{formatKlaava(gameState.maxBet)}</p>
        </div>
      </div>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Set phase</p>
        <div className="flex gap-2">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => handleAdvance({ phase })}
              className={`px-4 py-2 rounded text-sm capitalize font-medium transition-colors ${
                gameState.phase === phase
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Advance</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleAdvance({ nextRound: true })}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded"
          >
            Next round
          </button>
          <button
            onClick={() => handleAdvance({ nextLevel: true })}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded"
          >
            Next level — bets become {formatKlaava(nextMinBet)} / {formatKlaava(nextMaxBet)}
          </button>
        </div>
      </section>
    </div>
  )
}

export default GameControlView
