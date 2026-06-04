import { formatKlaava } from '../../../utils/formatters'

function EndRoundView({ session }) {
  const players = [...(session?.players ?? [])]
    .filter((p) => !p.eliminated)
    .sort((a, b) => b.klaava - a.klaava)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">End of Round</p>
        <p className="text-4xl font-bold">Standings</p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {players.map((player, i) => (
          <div
            key={player.id}
            className={`rounded-2xl px-6 py-4 flex items-center gap-5 ${
              i === 0 ? 'bg-yellow-900' : 'bg-gray-800'
            }`}
          >
            <span className={`text-3xl font-black w-10 ${i === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {i + 1}
            </span>
            <p className="text-2xl font-bold flex-1">{player.name}</p>
            {player.powerup && (
              <span className="text-sm text-yellow-400 bg-yellow-900/40 px-3 py-1 rounded-full">
                {player.powerup}
              </span>
            )}
            <p className={`text-2xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {formatKlaava(player.klaava)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EndRoundView
