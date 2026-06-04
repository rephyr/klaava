import { useEffect, useState } from 'react'
import { getLeaderboard, getSession } from '../../../services/gameService'
import { formatKlaava } from '../../../utils/formatters'

function FinishedView({ gameState }) {
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const session = await getSession()
        const sorted = (session?.players ?? [])
          .sort((a, b) => a.eliminated === b.eliminated ? b.klaava - a.klaava : a.eliminated ? 1 : -1)
        setLeaderboard(sorted.map((p, i) => ({
          position: i + 1,
          playerId: p.id,
          playerName: p.name,
          finalKlaava: p.klaava,
        })))
      } catch {}

      try {
        const saved = await getLeaderboard()
        if (saved?.length > 0) setLeaderboard(saved)
      } catch {}
    }
    load()
  }, [])

  const winner = leaderboard[0]

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-2xl mx-auto">

      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">Game Over</p>
        {winner ? (
          <>
            <p className="text-7xl font-black text-yellow-400 mb-2">{winner.playerName}</p>
            <p className="text-2xl font-semibold text-yellow-300 uppercase tracking-widest">Winner</p>
            <p className="text-green-400 text-xl mt-2">{formatKlaava(winner.finalKlaava)}</p>
          </>
        ) : (
          <p className="text-4xl font-bold text-gray-300">Loading results...</p>
        )}
      </div>

      {leaderboard.length > 1 && (
        <div className="flex flex-col gap-2 w-full">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Final Standings</p>
          {leaderboard.map((entry, i) => (
            <div
              key={entry.playerId}
              className={`rounded-2xl px-6 py-4 flex items-center gap-5 ${
                i === 0 ? 'bg-yellow-900' : 'bg-gray-800'
              }`}
            >
              <span className={`text-3xl font-black w-10 ${i === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                {entry.position}
              </span>
              <p className={`text-xl font-bold flex-1 ${i === 0 ? 'text-yellow-300' : 'text-white'}`}>
                {entry.playerName}
              </p>
              <p className={`text-xl font-semibold ${i === 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {formatKlaava(entry.finalKlaava)}
              </p>
            </div>
          ))}
        </div>
      )}

      {gameState && (
        <p className="text-gray-600 text-sm">
          {gameState.round} round{gameState.round !== 1 ? 's' : ''} · Level {gameState.level}
        </p>
      )}

    </div>
  )
}

export default FinishedView
