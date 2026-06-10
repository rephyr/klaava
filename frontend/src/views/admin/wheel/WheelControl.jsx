import { useState } from 'react'
import { spinWheel } from '../../../services/gameService'
import { toggleGame } from '../../../services/gamesService'

const GAME_PHASE = {
  'Hi-Lo': 'hiLo',
  'Blackjack': 'blackjack',
  'Roulette': 'roulette',
  'Auction': 'auction',
  'Ravit': 'ravit',
}

function WheelControl({ onPhaseChange, games, onWheelResult, onGamesChanged, onStartGame }) {
  const [result, setResult] = useState(null)
  const [removing, setRemoving] = useState(false)

  async function handleSpin() {
    const res = await spinWheel()
    await onPhaseChange('wheel')
    setResult(null)
    setTimeout(() => {
      setResult(res.winner)
      onWheelResult?.(res.winner)
    }, 4500)
  }

  async function handleRemove() {
    const game = games?.find((g) => g.name === result && g.isActive)
    if (!game) return
    setRemoving(true)
    await toggleGame(game.id)
    onGamesChanged?.()
    setRemoving(false)
  }

  const gameOnWheel = games?.find((g) => g.name === result && g.isActive)
  const phaseId = GAME_PHASE[result]

  function handleStartGame() {
    onPhaseChange(phaseId)
    onStartGame?.(phaseId)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleSpin}
        className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded w-fit"
      >
        Spin wheel
      </button>
      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">
            Landed on: <span className="text-yellow-400">{result}</span>
          </p>
          <div className="flex items-center gap-3">
            {phaseId && (
              <button
                onClick={handleStartGame}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
              >
                ▶ Play {result}
              </button>
            )}
            {gameOnWheel && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
              >
                {removing ? 'Removing...' : 'Remove from wheel'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WheelControl
