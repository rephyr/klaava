import { formatKlaava } from '../../../utils/formatters'

function LiveLeaderboard({ players, round, totalRounds, level }) {
  if (!players?.length) return null
  const sorted = [...players].sort((a, b) => b.klaava - a.klaava)

  return (
    <div className="h-full flex flex-col bg-gray-950 border-l border-gray-800">
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Standings</p>
        {round != null && (
          <p className="text-xs text-gray-600 mt-0.5">Round {round}{totalRounds ? `/${totalRounds}` : ''} · Lv {level}</p>
        )}
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto py-2">
        {sorted.map((p, i) => {
          const isLeader = i === 0
          const isLast = i === sorted.length - 1 && sorted.length > 1
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2.5 mx-2 rounded-lg ${isLeader ? 'bg-yellow-900/40' : ''}`}
            >
              <span className={`text-xs font-black w-5 text-center shrink-0 ${isLeader ? 'text-yellow-400' : isLast ? 'text-gray-600' : 'text-gray-500'}`}>
                {i + 1}
              </span>
              <span className={`flex-1 text-sm font-semibold truncate ${isLeader ? 'text-yellow-200' : isLast ? 'text-gray-500' : 'text-white'}`}>
                {isLeader ? '👑 ' : ''}{p.name}
              </span>
              <span className={`text-xs font-bold shrink-0 ${isLeader ? 'text-yellow-400' : 'text-green-400'}`}>
                {formatKlaava(p.klaava)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LiveLeaderboard
