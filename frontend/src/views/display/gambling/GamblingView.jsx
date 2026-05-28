import { formatKlaava } from '../../../utils/formatters'

function GamblingView({ session, gameState }) {
  const players = session?.players ?? []

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Stakes</p>
        <p className="text-2xl font-semibold">
          <span className="text-green-400">{formatKlaava(gameState.minBet)}</span>
          <span className="text-gray-500 mx-3">to</span>
          <span className="text-green-400">{formatKlaava(gameState.maxBet)}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2">
            <p className="text-2xl font-bold">{player.name}</p>
            <p className="text-3xl font-semibold text-green-400">{formatKlaava(player.klaava)}</p>
            {player.rfid && <p className="text-xs text-gray-500">RFID: {player.rfid}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GamblingView
