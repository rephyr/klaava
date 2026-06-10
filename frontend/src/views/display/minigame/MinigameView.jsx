import { useEffect, useRef, useState } from 'react'
import { formatKlaava } from '../../../utils/formatters'

function DoubleOrNothingResult({ results }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Double or Nothing</p>
        <p className="text-4xl font-bold">Flip Results</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {results.map((r) => {
          const blocked = ['shield', 'immunity'].includes(r.powerupTriggered)
          return (
            <div key={r.playerId} className={`rounded-2xl p-6 flex flex-col items-center gap-2 ${r.result === 'win' ? 'bg-green-900' : blocked ? 'bg-blue-900' : 'bg-gray-800'}`}>
              <p className="text-xl font-bold">{r.name}</p>
              {blocked ? (
                <><p className="text-5xl font-black text-blue-300 uppercase">{r.powerupTriggered}</p><p className="text-2xl font-semibold text-blue-400">blocked</p></>
              ) : r.result === 'win' ? (
                <><p className="text-5xl font-black text-green-300">WIN</p>
                <p className="text-2xl font-semibold text-green-400">+{formatKlaava(r.amount)}</p></>
              ) : (
                <p className="text-5xl font-black text-gray-500">NO WIN</p>
              )}
              <p className="text-gray-400 text-sm">{formatKlaava(r.klaava)}</p>
            </div>
          )
        })}
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
        {amount > 0 && <p className="text-gray-400 text-sm mt-2">Prize: <span className="text-white">{formatKlaava(amount)}</span></p>}
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {results.map((r) => {
          const blocked = ['shield', 'immunity'].includes(r.powerupTriggered)
          return (
            <div key={r.playerId} className={`rounded-2xl p-6 flex flex-col items-center gap-2 ${r.outcome === 'winner' ? 'bg-green-900' : blocked ? 'bg-blue-900' : 'bg-gray-800'}`}>
              <p className="text-xl font-bold">{r.name}</p>
              <p className="text-7xl font-black leading-none">{r.roll}</p>
              <p className={`text-sm uppercase tracking-widest font-semibold ${r.outcome === 'winner' ? 'text-green-400' : blocked ? 'text-blue-300' : 'text-gray-500'}`}>
                {blocked ? r.powerupTriggered : r.outcome}
              </p>
              <p className="text-gray-400 text-sm">{formatKlaava(r.klaava)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorseRaceResult({ minigame }) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [showBattle, setShowBattle] = useState(false)
  const [battleAttackIdx, setBattleAttackIdx] = useState(-1)
  const intervalRef = useRef(null)
  const battleIntervalRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!minigame?.rounds?.length) return

    setRoundIdx(0)
    setShowResults(false)
    setShowBattle(false)
    setBattleAttackIdx(-1)
    clearInterval(intervalRef.current)
    clearInterval(battleIntervalRef.current)
    clearTimeout(timeoutRef.current)

    let idx = 0
    intervalRef.current = setInterval(() => {
      idx++
      if (idx >= minigame.rounds.length) {
        clearInterval(intervalRef.current)
        if (minigame.photoFinish && minigame.tiebreaker?.attacks?.length) {
          setShowBattle(true)
          let battIdx = -1
          battleIntervalRef.current = setInterval(() => {
            battIdx++
            if (battIdx >= minigame.tiebreaker.attacks.length) {
              clearInterval(battleIntervalRef.current)
              timeoutRef.current = setTimeout(() => {
                setShowBattle(false)
                setShowResults(true)
              }, 2000)
              return
            }
            setBattleAttackIdx(battIdx)
          }, 750)
        } else {
          timeoutRef.current = setTimeout(() => setShowResults(true), 1800)
        }
        return
      }
      setRoundIdx(idx)
    }, 1600)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(battleIntervalRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [minigame?.raceId, minigame?.winnerId])

  if (!minigame?.rounds) return null

  const round = minigame.rounds[roundIdx] ?? minigame.rounds[minigame.rounds.length - 1]
  const posById = Object.fromEntries(round.positions.map((p) => [p.id, p]))
  const totalRounds = minigame.rounds.length - 1

  const battleHorses = (minigame.photoFinishIds ?? [])
    .map((id) => minigame.horses.find((h) => h.id === id))
    .filter(Boolean)

  const tiebreakerAttacks = minigame.tiebreaker?.attacks ?? []
  const tiebreakerMaxHp = minigame.tiebreaker?.maxHp ?? 10
  const visibleBattleAttacks = battleAttackIdx >= 0 ? tiebreakerAttacks.slice(0, battleAttackIdx + 1) : []
  const currentBattleEvent = battleAttackIdx >= 0 ? tiebreakerAttacks[battleAttackIdx] : null

  const battleHp = {}
  for (const horse of battleHorses) battleHp[horse.id] = tiebreakerMaxHp
  for (const att of visibleBattleAttacks) {
    if (att.type === 'attack') {
      const def = battleHorses.find((h) => h.name === att.defenderName)
      if (def) battleHp[def.id] = att.defenderHp
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-3xl mx-auto relative">

      {showBattle && (
        <div className="absolute inset-0 z-10 bg-gray-950 rounded-2xl flex flex-col p-6 gap-4 overflow-hidden">
          <p className="text-3xl font-black text-center text-yellow-400 tracking-widest">⚔️ DEAD HEAT ⚔️</p>

          {/* HP bars */}
          <div className="flex gap-4">
            {battleHorses.map((horse) => {
              const hp = battleHp[horse.id] ?? tiebreakerMaxHp
              const hpPct = Math.max(0, hp / tiebreakerMaxHp * 100)
              const dead = hp <= 0
              return (
                <div key={horse.id} className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-sm font-bold">
                    <span style={{ color: dead ? '#6b7280' : horse.color }}>{dead ? '💀 ' : ''}{horse.name}</span>
                    <span style={{ color: dead ? '#6b7280' : horse.color }}>{Math.max(0, hp)}/{tiebreakerMaxHp}</span>
                  </div>
                  <div className="w-full h-5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${hpPct}%`,
                        backgroundColor: dead ? '#374151' : hpPct > 50 ? horse.color : hpPct > 25 ? '#eab308' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current event */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {battleAttackIdx === -1 && (
              <p className="text-2xl text-gray-400 animate-pulse">Fight starting...</p>
            )}
            {currentBattleEvent?.type === 'attack' && (
              <>
                <p className="text-3xl font-black" style={{ color: currentBattleEvent.attackerColor }}>
                  🐴 {currentBattleEvent.attackerName}
                </p>
                <p className="text-5xl font-black text-yellow-300">{currentBattleEvent.attackName}!</p>
                <p className="text-4xl font-black text-red-400">-{currentBattleEvent.damage} HP</p>
                <p className="text-lg text-gray-400">
                  → <span style={{ color: currentBattleEvent.defenderColor }}>{currentBattleEvent.defenderName}</span>
                </p>
              </>
            )}
            {currentBattleEvent?.type === 'death' && (
              <>
                <p className="text-7xl">💀</p>
                <p className="text-3xl font-black text-red-400">{currentBattleEvent.name} ELIMINATED!</p>
              </>
            )}
          </div>

          {/* Attack log */}
          <div className="flex flex-col gap-0.5">
            {visibleBattleAttacks.filter((a) => a.type === 'attack').slice(-4).map((att, i) => (
              <p key={i} className="text-xs text-gray-600">
                <span style={{ color: att.attackerColor }}>{att.attackerName}</span>
                {' → '}<span className="text-yellow-800">{att.attackName}</span>
                {' '}−{att.damage}
                {' on '}<span style={{ color: att.defenderColor }}>{att.defenderName}</span>
                {' '}<span className="text-gray-700">({att.defenderHp} HP left)</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between w-full">
        <div>
          <p className="text-gray-400 text-sm uppercase tracking-widest">Horse Race</p>
          {showResults && minigame.winnerName && (
            <p className="text-3xl font-black mt-1">
              <span style={{ color: minigame.horses.find((h) => h.id === minigame.winnerId)?.color }}>
                {minigame.winnerName}
              </span>{' wins!'}
            </p>
          )}
          {!showResults && <p className="text-2xl font-bold mt-1 animate-pulse">Round {round.roundNumber} / {totalRounds}</p>}
        </div>
        {!showResults && (
          <div className="flex gap-1">
            {minigame.rounds.map((_, i) => (
              <div key={i} className={`h-1.5 w-4 rounded-full ${i <= roundIdx ? 'bg-white' : 'bg-gray-600'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Track */}
      <div className="w-full flex flex-col gap-2">
        {minigame.horses.map((horse) => {
          const pos = posById[horse.id]
          const pct = Math.min(100, Math.round((pos?.position ?? 0) / minigame.trackLength * 100))
          const isDead = pos?.status === 'dead'
          const isFighting = pos?.fighting
          const isStumbling = pos?.stumbling
          const isTired = pos?.tired
          const isWinner = horse.id === minigame.winnerId
          const bet = minigame.bets.find((b) => b.horseId === horse.id)

          const hpPct = pos && !isDead ? Math.max(0, (pos.hp / pos.maxHp) * 100) : 0
          const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444'

          return (
            <div key={horse.id} className="flex items-center gap-3">
              <div className="w-24 text-right">
                <p className="text-sm font-semibold truncate">{horse.name}</p>
                {horse.odds && !showResults && <p className="text-xs text-gray-500">{horse.odds}x</p>}
                {!isDead && pos && (
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hpPct}%`, backgroundColor: hpColor }} />
                    </div>
                    <span className="text-xs text-gray-500">{pos.hp}</span>
                  </div>
                )}
                {isDead && <p className="text-xs text-red-400">💀 dead</p>}
                {isFighting && !isDead && <p className="text-xs text-yellow-400">⚔️ fight</p>}
                {isStumbling && !isDead && <p className="text-xs text-orange-400">🤕 stumble</p>}
                {isTired && !isDead && !isFighting && <p className="text-xs text-gray-400">😮‍💨 tired</p>}
              </div>

              <div className="flex-1 bg-gray-700 rounded-full h-10 relative overflow-hidden">
                {/* Finish line */}
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white opacity-30" />
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 text-base transition-all duration-700"
                  style={{
                    width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
                    backgroundColor: isDead ? '#374151' : isFighting ? '#92400e' : horse.color,
                    opacity: isDead ? 0.4 : 1,
                  }}
                >
                  {isDead ? '💀' : '🐴'}
                </div>
              </div>

              <div className="w-28 text-sm">
                {showResults && bet ? (
                  bet.result === 'win' ? (
                    <span className="text-green-400 font-bold">+{formatKlaava(bet.payout)}</span>
                  ) : bet.result === 'dead' ? (
                    <span className="text-gray-500 font-bold">💀 No win</span>
                  ) : (
                    <span className="text-gray-500 font-bold">No win</span>
                  )
                ) : (
                  <span className="text-gray-500 text-xs">{pct}%</span>
                )}
                {isWinner && showResults && <span className="ml-1">🏆</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Fight slideshow panel */}
      {(() => {
        const attacks = round.events?.filter((e) => e.type === 'attack') ?? []
        if (attacks.length === 0) return null
        return (
          <div className="w-full bg-gray-900 border border-amber-700 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs text-amber-400 uppercase tracking-widest font-bold text-center">⚔️ Fight!</p>
            {attacks.map((ev, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-bold w-20 text-right truncate" style={{ color: ev.attackerColor }}>{ev.attackerName}</span>
                <span className="text-yellow-300 text-sm font-semibold w-24 shrink-0">{ev.attackName}!</span>
                <span className="text-red-400 text-sm font-bold w-12 shrink-0">-{ev.damage} HP</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, (ev.defenderHp / ev.defenderMaxHp) * 100)}%`,
                        backgroundColor: ev.defenderHp / ev.defenderMaxHp > 0.5 ? '#22c55e' : ev.defenderHp / ev.defenderMaxHp > 0.25 ? '#eab308' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold shrink-0" style={{ color: ev.defenderColor }}>
                    {ev.defenderName} {ev.defenderHp}/{ev.defenderMaxHp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Non-attack events */}
      {round.events?.some((e) => e.type !== 'attack') && (
        <div className="w-full flex flex-col gap-1">
          {round.events.filter((e) => e.type !== 'attack').map((ev, i) => (
            <p key={i} className={`text-sm text-center font-medium ${
              ev.type === 'death' ? 'text-red-400' :
              ev.type === 'fight_start' ? 'text-yellow-400' :
              ev.type === 'motivated' ? 'text-green-400' :
              ev.type === 'stumble' ? 'text-orange-400' :
              'text-gray-400'
            }`}>{ev.detail}</p>
          ))}
        </div>
      )}

      {/* Final result cards */}
      {showResults && (
        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          {minigame.bets.map((bet) => {
            const isDead = bet.result === 'dead'
            const isWin = bet.result === 'win'
            const isBlocked = ['dead_blocked', 'lose_blocked'].includes(bet.result)
            return (
              <div key={bet.playerId} className={`rounded-2xl p-4 flex flex-col gap-1 ${isWin ? 'bg-green-900' : isDead ? 'bg-red-950 border border-red-700' : isBlocked ? 'bg-blue-900' : 'bg-red-900'}`}>
                <div className="flex justify-between">
                  <p className="font-bold text-lg">{bet.playerName}</p>
                  <span className="text-sm text-gray-300">{bet.horseName}{isDead ? ' 💀' : ''}</span>
                </div>
                <p className={`text-2xl font-black ${isWin ? 'text-green-300' : isBlocked ? 'text-blue-300' : 'text-red-300'}`}>
                  {isWin && `WIN +${formatKlaava(bet.payout)}`}
                  {isDead && `DEAD HORSE -${formatKlaava(Math.abs(bet.payout))}`}
                  {bet.result === 'lose' && `LOSE -${formatKlaava(bet.amount)}`}
                  {isBlocked && `${bet.powerupTriggered?.toUpperCase()} BLOCKED`}
                </p>
                {bet.klaava != null && <p className="text-gray-400 text-sm">{formatKlaava(bet.klaava)} remaining</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MinigameView({ session, gameState }) {
  const players = session?.players ?? []
  const minigame = gameState?.minigame

  if (minigame?.type === 'doubleOrNothing') return <DoubleOrNothingResult results={minigame.results} />
  if (minigame?.type === 'lastRoll') return <LastRollResult results={minigame.results} amount={minigame.amount} />
  if (minigame?.type === 'horseRace') return <HorseRaceResult minigame={minigame} />

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
