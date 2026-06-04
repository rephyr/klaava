import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGameState, getSession } from '../../services/gameService'
import { formatKlaava } from '../../utils/formatters'
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

const POLL_INTERVAL = 3000

function DisplayView() {
  const [gameState, setGameState] = useState(null)
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

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
    if (phase === 'minigame') return <MinigameView session={session} gameState={gameState} />
    if (phase === 'shop')     return <ShopView gameState={gameState} />
    if (phase === 'result')   return <ResultView gameState={gameState} />
    if (phase === 'wheel')    return <WheelView gameState={gameState} />
    if (phase === 'hiLo')      return <HiLoView />
    if (phase === 'blackjack') return <BlackjackView />
    if (phase === 'loans')     return <LoanView />
    if (phase === 'roulette')  return <RouletteView />
    if (phase === 'auction')   return <AuctionView />
    if (phase === 'endRound')  return <EndRoundView session={session} />
    if (phase === 'finished') {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-5xl font-bold">Game Over</p>
          <p className="text-gray-400">Thanks for playing</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      <div className="flex justify-between items-center px-8 py-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Klaava</h1>
        {gameState?.sessionId && (
          <div className="flex gap-6 text-sm text-gray-400 capitalize">
            <span>Phase: <span className="text-white">{phase}</span></span>
            <span>Round: <span className="text-white">{gameState.round}</span></span>
            <span>Level: <span className="text-white">{gameState.level}</span></span>
          </div>
        )}
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1 rounded transition-colors"
        >
          Admin
        </button>
      </div>

      <div className="flex-1 flex flex-col p-8">
        {renderPhase()}
      </div>

    </div>
  )
}

export default DisplayView
