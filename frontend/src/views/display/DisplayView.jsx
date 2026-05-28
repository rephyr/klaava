import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers } from '../../services/playerService'
import { getGameState } from '../../services/gameService'
import { formatKlaava } from '../../utils/formatters'

function DisplayView() {
  const [players, setPlayers] = useState([])
  const [gameState, setGameState] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getPlayers().then(setPlayers)
    getGameState().then(setGameState)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-4xl font-bold">Klaava</h1>
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-3 py-1 rounded transition-colors"
        >
          Admin
        </button>
      </div>

      {gameState && (
        <p className="text-center text-gray-400 mb-8 capitalize">
          Phase: {gameState.phase} — Round {gameState.round} — Level {gameState.level} — Stake: {formatKlaava(gameState.stake)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 rounded-xl p-4">
            <p className="text-lg font-semibold">{player.name}</p>
            <p className="text-green-400">{formatKlaava(player.klaava)}</p>
            <p className="text-xs text-gray-500 mt-1">RFID: {player.rfid}</p>
          </div>
        ))}
      </div>

    </div>
  )
}

export default DisplayView
