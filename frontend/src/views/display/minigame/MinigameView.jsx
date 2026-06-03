import { formatKlaava } from '../../../utils/formatters'

function DoubleOrNothingResult({ results }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Double or Nothing</p>
        <p className="text-4xl font-bold">Flip Results</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {results.map((r) => (
          <div
            key={r.playerId}
            className={`rounded-2xl p-6 flex flex-col items-center gap-2 ${
              r.result === 'win' ? 'bg-green-900' : 'bg-red-900'
            }`}
          >
            <p className="text-xl font-bold">{r.name}</p>
            <p className={`text-5xl font-black ${r.result === 'win' ? 'text-green-300' : 'text-red-300'}`}>
              {r.result === 'win' ? 'WIN' : 'LOSE'}
            </p>
            <p className={`text-2xl font-semibold ${r.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
              {r.result === 'win' ? '+' : '-'}{formatKlaava(r.amount)}
            </p>
            <p className="text-gray-400 text-sm">{formatKlaava(r.klaava)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LastRollResult({ results, amount }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Last Roll</p>
        <p className="text-4xl font-bold">Dice Results</p>
        {amount > 0 && (
          <p className="text-gray-400 text-sm mt-2">
            Stake: <span className="text-white">{formatKlaava(amount)}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {results.map((r) => (
          <div
            key={r.playerId}
            className={`rounded-2xl p-6 flex flex-col items-center gap-2 ${
              r.outcome === 'winner' ? 'bg-green-900'
              : r.outcome === 'loser' ? 'bg-red-900'
              : 'bg-gray-800'
            }`}
          >
            <p className="text-xl font-bold">{r.name}</p>
            <p className="text-7xl font-black leading-none">{r.roll}</p>
            <p className={`text-sm uppercase tracking-widest font-semibold ${
              r.outcome === 'winner' ? 'text-green-400'
              : r.outcome === 'loser' ? 'text-red-400'
              : 'text-gray-500'
            }`}>{r.outcome}</p>
            <p className="text-gray-400 text-sm">{formatKlaava(r.klaava)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MinigameView({ session, gameState }) {
  const players = session?.players ?? []
  const minigame = gameState?.minigame

  if (minigame?.type === 'doubleOrNothing') {
    return <DoubleOrNothingResult results={minigame.results} />
  }

  if (minigame?.type === 'lastRoll') {
    return <LastRollResult results={minigame.results} amount={minigame.amount} />
  }

  const nextMinBet = Math.round(gameState.minBet * gameState.betMultiplier)
  const nextMaxBet = Math.round(gameState.maxBet * gameState.betMultiplier)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Minigame</p>
        <p className="text-5xl font-bold">Level {gameState.level}</p>
        <p className="text-gray-400 text-sm mt-2">
          Next bets:{' '}
          <span className="text-yellow-400">{formatKlaava(nextMinBet)}</span>
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
