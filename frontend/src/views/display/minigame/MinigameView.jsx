import { formatKlaava } from '../../../utils/formatters'

function MinigameView({ session, gameState }) {
  const players = session?.players ?? []
  const nextMinBet = Math.round(gameState.minBet * gameState.betMultiplier)
  const nextMaxBet = Math.round(gameState.maxBet * gameState.betMultiplier)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Minigame</p>
        <p className="text-5xl font-bold">Level {gameState.level}</p>
        <p className="text-gray-400 text-sm mt-2">
          Next bets: <span className="text-yellow-400">{formatKlaava(nextMinBet)}</span>
          <span className="text-gray-500 mx-2">to</span>
          <span className="text-yellow-400">{formatKlaava(nextMaxBet)}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2">
            <p className="text-2xl font-bold">{player.name}</p>
            <p className="text-3xl font-semibold text-green-400">{formatKlaava(player.klaava)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MinigameView
