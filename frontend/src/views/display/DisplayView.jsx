import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGameState, getSession } from '../../services/gameService'
import { formatKlaava } from '../../utils/formatters'

function DisplayView() {
  const [gameState, setGameState] = useState(null)
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getGameState().then(setGameState)
  }, [])

  useEffect(() => {
    if (gameState?.sessionId) {
      getSession().then(setSession)
    }
  }, [gameState])

  const isLobby = !gameState?.sessionId || gameState?.phase === 'lobby'

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Klaava</h1>
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-3 py-1 rounded transition-colors"
        >
          Admin
        </button>
      </div>

      {isLobby ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-4">
          <p className="text-3xl font-semibold text-gray-300">Waiting for players...</p>
        </div>
      ) : (
        <>
          <p className="text-center text-gray-400 mb-8 capitalize">
            Phase: {gameState.phase} --- Round {gameState.round} --- Level {gameState.level} --- Stake: {formatKlaava(gameState.stake)}
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
            {(session?.players ?? []).map((player) => (
              <div key={player.id} className="bg-gray-800 rounded-xl p-4">
                <p className="text-lg font-semibold">{player.name}</p>
                <p className="text-green-400">{formatKlaava(player.klaava)}</p>
                <p className="text-xs text-gray-500 mt-1">RFID: {player.rfid ?? '—'}</p>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}

export default DisplayView
