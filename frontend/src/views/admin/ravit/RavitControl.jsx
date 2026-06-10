import { useEffect, useRef, useState } from 'react'
import { startHorseRace, placeHorseRaceBet, runHorseRace, resetHorseRace } from '../../../services/minigameService'
import { formatKlaava } from '../../../utils/formatters'

const AUTO_ADVANCE_SECONDS = 10

function RavitControl({ players, gameState, gamblingRounds = 3, refreshPlayers, onPhaseChange }) {
  const [raceState, setRaceState] = useState(null)
  const [raceBets, setRaceBets] = useState({})
  const [loading, setLoading] = useState(false)
  const [raceError, setRaceError] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [roundsPlayed, setRoundsPlayed] = useState(0)
  const countdownRef = useRef(null)

  function startCountdown() {
    setCountdown(AUTO_ADVANCE_SECONDS)
    countdownRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(countdownRef.current)
          onPhaseChange?.('shop')
          return null
        }
        return n - 1
      })
    }, 1000)
  }

  function cancelAutoAdvance() {
    clearInterval(countdownRef.current)
    setCountdown(null)
  }

  async function handleStartRace() {
    setRaceError(null)
    const s = await startHorseRace()
    onPhaseChange?.('ravit')
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
      if (res.status === 'finished') {
        const next = roundsPlayed + 1
        setRoundsPlayed(next)
        if (next >= gamblingRounds) startCountdown()
      }
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
    <div className="flex flex-col gap-4">

      {(!raceState || raceState.status === 'idle') && (
        <button onClick={handleStartRace} className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded font-semibold w-fit">
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
          <div className="flex gap-2 items-center mt-1">
            {roundsPlayed < gamblingRounds ? (
              <button onClick={handleResetRace} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded font-semibold">
                Next race ({roundsPlayed}/{gamblingRounds})
              </button>
            ) : countdown != null ? (
              <>
                <button onClick={() => onPhaseChange?.('shop')} className="bg-green-700 hover:bg-green-600 text-white text-sm px-5 py-2 rounded font-semibold">
                  → Shop ({countdown}s)
                </button>
                <button onClick={cancelAutoAdvance} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => onPhaseChange?.('shop')} className="bg-green-700 hover:bg-green-600 text-white text-sm px-5 py-2 rounded font-semibold">
                → Shop
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default RavitControl
