import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGameState, getSession } from '../../services/gameService'
import { getLoansByPlayer } from '../../services/loanService'
import GamblingView from './gambling/GamblingView'
import MinigameView from './minigame/MinigameView'
import ShopView from './shop/ShopView'
import ResultView from './result/ResultView'
import WheelView from './wheel/WheelView'
import HiLoView from './hiLo/HiLoView'
import BlackjackView from './blackjack/BlackjackView'
import LoanView from './loans/LoanView'
import RouletteView from './roulette/RouletteView'
import AuctionView from './auction/AuctionView'
import EndRoundView from './endRound/EndRoundView'
import FinishedView from './finished/FinishedView'
import LoansharkOverlay from './loanshark/LoansharkOverlay'
import BankruptcyOverlay from './bankruptcy/BankruptcyOverlay'
import LiveLeaderboard from './leaderboard/LiveLeaderboard'

const POLL_INTERVAL = 3000

function DisplayView() {
  const [gameState, setGameState] = useState(null)
  const [session, setSession] = useState(null)
  const [bankruptPlayers, setBankruptPlayers] = useState([])
  const [endRoundDebtors, setEndRoundDebtors] = useState([])
  const navigate = useNavigate()
  const prevActiveIdsRef = useRef(new Set())
  const bankruptTimeoutRef = useRef(null)

  useEffect(() => {
    async function poll() {
      const state = await getGameState()
      setGameState(state)
      if (state?.sessionId) {
        getSession().then(setSession)
      } else {
        setSession(null)
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // Detect newly eliminated players and show bankruptcy screen
  useEffect(() => {
    if (!session) {
      prevActiveIdsRef.current = new Set()
      return
    }
    const prevIds = prevActiveIdsRef.current
    const justEliminated = session.players.filter((p) => p.eliminated && prevIds.has(p.id))
    prevActiveIdsRef.current = new Set(session.players.filter((p) => !p.eliminated).map((p) => p.id))

    if (justEliminated.length > 0) {
      if (bankruptTimeoutRef.current) clearTimeout(bankruptTimeoutRef.current)
      setBankruptPlayers(justEliminated)
      bankruptTimeoutRef.current = setTimeout(() => setBankruptPlayers([]), 5000)
    }
  }, [session])

  // Fetch loans for all players when endRound starts
  useEffect(() => {
    if (gameState?.phase !== 'endRound' || !session) {
      setEndRoundDebtors([])
      return
    }
    const active = session.players.filter((p) => !p.eliminated)
    Promise.all(
      active.map((p) => getLoansByPlayer(p.id).then((loans) => ({ player: p, loans })).catch(() => ({ player: p, loans: [] })))
    ).then((results) => setEndRoundDebtors(results.filter((r) => r.loans.length > 0)))
  }, [gameState?.phase, session?.id])

  const phase = gameState?.phase ?? 'lobby'

  function renderPhase() {
    if (phase === 'lobby' || !session) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-3xl font-semibold text-gray-300">Waiting for players...</p>
          <p className="text-gray-500 text-sm">Start the game from the admin lobby</p>
        </div>
      )
    }
    if (phase === 'gambling') return <GamblingView session={session} gameState={gameState} />
    if (phase === 'minigame' || phase === 'ravit') return <MinigameView session={session} gameState={gameState} />
    if (phase === 'shop')     return <ShopView gameState={gameState} />
    if (phase === 'result')   return <ResultView gameState={gameState} />
    if (phase === 'wheel')    return <WheelView gameState={gameState} />
    if (phase === 'hiLo')      return <HiLoView />
    if (phase === 'blackjack') return <BlackjackView session={session} />
    if (phase === 'loans')     return <LoanView />
    if (phase === 'roulette')  return <RouletteView />
    if (phase === 'auction')   return <AuctionView />
    if (phase === 'endRound')  return <EndRoundView session={session} />
    if (phase === 'finished') return <FinishedView gameState={gameState} />
    return null
  }

  const activePlayers = (session?.players ?? []).filter((p) => !p.eliminated)
  const showLeaderboard = !!gameState?.sessionId && !['lobby', 'finished', 'result'].includes(phase)

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">

      <div className="flex justify-between items-center px-8 py-3 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold">Klaava</h1>
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1 rounded transition-colors"
        >
          Admin
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-8 overflow-y-auto min-w-0">
          {renderPhase()}
        </div>

        {showLeaderboard && (
          <div className="w-48 shrink-0">
            <LiveLeaderboard
              players={activePlayers}
              round={gameState.round}
              totalRounds={gameState.totalRounds}
              level={gameState.level}
            />
          </div>
        )}
      </div>

      {(() => {
        if (phase === 'endRound' && endRoundDebtors.length > 0)
          return <LoansharkOverlay debtors={endRoundDebtors} />
        const minBet = gameState?.minBet ?? 0
        const broke = minBet > 0
          ? (session?.players ?? []).filter((p) => !p.eliminated && p.klaava < minBet)
          : []
        return broke.length > 0 && phase !== 'finished' && phase !== 'endRound'
          ? <LoansharkOverlay players={broke} />
          : null
      })()}

      {bankruptPlayers.length > 0 && <BankruptcyOverlay players={bankruptPlayers} />}

    </div>
  )
}

export default DisplayView
