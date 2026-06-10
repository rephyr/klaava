import { useState } from 'react'
import { playDoubleOrNothing, playLastRoll, startHorseRace, placeHorseRaceBet, runHorseRace, resetHorseRace } from '../../../services/minigameService'
import { formatKlaava } from '../../../utils/formatters'

function MinigameControl({ players, gameState, refreshPlayers, onPhaseChange }) {
  const [donSelected, setDonSelected] = useState([])
  const [donAmount, setDonAmount] = useState(gameState?.minBet ?? 50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [raceState, setRaceState] = useState(null)
  const [raceBets, setRaceBets] = useState({})
  const [raceError, setRaceError] = useState(null)

  function toggleDon(id) {
    setDonSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleDoubleOrNothing() {
    if (donSelected.length === 0) return
    setLoading(true)
    try {
      const res = await playDoubleOrNothing(donSelected, donAmount)
      setResult({ type: 'doubleOrNothing', ...res })
      refreshPlayers()
    } finally {
      setLoading(false)
    }
  }

  async function handleLastRoll() {
    setLoading(true)
    try {
      const res = await playLastRoll()
      setResult({ type: 'lastRoll', ...res })
      refreshPlayers()
    } finally {
      setLoading(false)
    }
  }

  async function handleStartRace() {
    setRaceError(null)
    const s = await startHorseRace()
    // Switch display to minigame phase so the animation is visible
    onPhaseChange?.('minigame')
    // Auto-place default bets so "Run race!" always has bets registered
    const defaultAmount = gameState?.minBet ?? 50
    const defaultBets = {}
    await Promise.all(
      players.map((player, i) => {
        const horse = s.horses[i % s.horses.length]
        defaultBets[player.id] = { horseId: horse.id, amount: defaultAmount }
        return placeHorseRaceBet(player.id, player.name, horse.id, defaultAmount)
      })
    )
    setRaceBets(defaultBets)
    setRaceState(s)
    setResult(null)
  }

  function updateRaceBet(player, horseId, amount) {
    setRaceBets((prev) => ({ ...prev, [player.id]: { horseId, amount } }))
    placeHorseRaceBet(player.id, player.name, horseId, amount)
  }

  async function handleRunRace() {
    setLoading(true)
    setRaceError(null)
    try {
      const res = await runHorseRace()
      setRaceState(res)
      refreshPlayers()
    } catch (err) {
      setRaceError(err?.message ?? 'Race failed — check that bets are placed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetRace() {
    const s = await resetHorseRace()
    setRaceState(s)
    setRaceBets({})
  }

  return (
    <div className="flex flex-col gap-8">

      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Horse Race</p>

        {(!raceState || raceState.status === 'idle') && (
          <button onClick={handleStartRace} className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded font-semibold">
            Set up race
          </button>
        )}

        {raceState?.status === 'betting' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 mb-1">
              {raceState.horses.map((h) => (
                <span key={h.id} className="px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1" style={{ backgroundColor: h.color }}>
                  {h.name}
                  {h.odds && <span className="opacity-75 font-normal">{h.odds}x</span>}
                </span>
              ))}
            </div>
            {players.map((player) => {
              const bet = raceBets[player.id] ?? { horseId: raceState.horses[0]?.id, amount: gameState?.minBet ?? 50 }
              return (
                <div key={player.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                  <p className="w-24 font-medium text-sm">{player.name}</p>
                  <p className="text-green-400 text-sm w-20">{formatKlaava(player.klaava)}</p>
                  <div className="flex gap-1">
                    {raceState.horses.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => updateRaceBet(player, h.id, bet.amount)}
                        className="px-3 py-1 rounded text-xs font-semibold text-white flex flex-col items-center leading-tight"
                        style={{ backgroundColor: bet.horseId === h.id ? h.color : '#374151', opacity: bet.horseId === h.id ? 1 : 0.5 }}
                      >
                        <span>{h.name}</span>
                        {h.odds && <span className="font-normal opacity-80">{h.odds}x</span>}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={bet.amount}
                    onChange={(e) => updateRaceBet(player, bet.horseId, Number(e.target.value))}
                    className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-20"
                  />
                </div>
              )
            })}
            {raceError && <p className="text-red-400 text-xs">{raceError}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={handleRunRace} disabled={loading} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm px-5 py-2 rounded font-semibold">
                Run race!
              </button>
              <button onClick={handleResetRace} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        )}

        {raceState?.status === 'finished' && (
          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold">
              Winner: <span style={{ color: raceState.horses.find((h) => h.id === raceState.winnerId)?.color }}>{raceState.winnerName}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {raceState.bets.map((bet) => (
                <div key={bet.playerId} className={`rounded-xl px-4 py-2 text-sm ${bet.result === 'win' ? 'bg-green-900' : 'bg-gray-800'}`}>
                  <p className="font-semibold">{bet.playerName}</p>
                  <p className="text-xs text-gray-300">{bet.horseName}</p>
                  <p className={`font-bold ${bet.result === 'win' ? 'text-green-400' : 'text-gray-500'}`}>
                    {bet.result === 'win' ? `+${formatKlaava(bet.payout)}` : 'No win'}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={handleResetRace} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded w-fit">New race</button>
          </div>
        )}
      </section>

      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Double or Nothing</p>
        <div className="flex gap-6 items-start flex-wrap">
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <label key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${donSelected.includes(p.id) ? 'border-indigo-500 bg-indigo-950' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
                <input type="checkbox" checked={donSelected.includes(p.id)} onChange={() => toggleDon(p.id)} className="accent-indigo-500" />
                <span className="text-sm">{p.name}</span>
                <span className="text-xs text-green-400">{formatKlaava(p.klaava)}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Amount per player</p>
              <input type="number" value={donAmount} onChange={(e) => setDonAmount(Number(e.target.value))} className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-28" />
            </div>
            <button onClick={handleDoubleOrNothing} disabled={donSelected.length === 0 || loading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-semibold">
              Flip ({donSelected.length} players)
            </button>
          </div>
        </div>
      </section>

      <section>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Last Roll</p>
        <p className="text-gray-400 text-sm mb-3">All active players roll a die. Highest roller wins <span className="text-white">{formatKlaava(gameState?.minBet ?? 0)}</span> from the house.</p>
        <button onClick={handleLastRoll} disabled={loading || players.length < 2} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-semibold">
          Roll for all
        </button>
      </section>

      {result && result.type !== 'horseRace' && (
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Result</p>
          {result.type === 'doubleOrNothing' && (
            <div className="flex gap-3 flex-wrap">
              {result.results.map((r) => {
                const blocked = ['shield', 'immunity'].includes(r.powerupTriggered)
                return (
                  <div key={r.playerId} className={`rounded-xl px-5 py-3 text-sm ${r.result === 'win' ? 'bg-green-900' : blocked ? 'bg-blue-900' : 'bg-gray-800'}`}>
                    <p className="font-semibold">{r.name}</p>
                    {blocked ? <p className="font-bold text-lg text-blue-300 uppercase">{r.powerupTriggered}</p>
                      : r.result === 'win' ? <p className="font-bold text-lg text-green-400">+{formatKlaava(r.amount)}</p>
                      : <p className="font-bold text-lg text-gray-500">No win</p>}
                    <p className="text-xs text-gray-400">{formatKlaava(r.klaava)} total</p>
                  </div>
                )
              })}
            </div>
          )}
          {result.type === 'lastRoll' && (
            <div className="flex gap-3 flex-wrap">
              {result.results.map((r) => {
                const blocked = ['shield', 'immunity'].includes(r.powerupTriggered)
                return (
                  <div key={r.playerId} className={`rounded-xl px-5 py-3 text-center ${r.outcome === 'winner' ? 'bg-green-900' : blocked ? 'bg-blue-900' : 'bg-gray-800'}`}>
                    <p className="text-sm font-semibold mb-1">{r.name}</p>
                    <p className="text-4xl font-bold">{r.roll}</p>
                    <p className={`text-xs mt-1 capitalize ${r.outcome === 'winner' ? 'text-green-400' : blocked ? 'text-blue-300' : 'text-gray-500'}`}>
                      {blocked ? r.powerupTriggered : r.outcome}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

    </div>
  )
}

export default MinigameControl
