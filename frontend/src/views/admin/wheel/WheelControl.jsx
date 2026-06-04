import { useState } from 'react'
import { spinWheel } from '../../../services/gameService'
import { toggleGame } from '../../../services/gamesService'

function WheelControl({ onPhaseChange, games, onWheelResult, onGamesChanged }) {
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

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleSpin}
        className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded w-fit"
      >
        Spin wheel
      </button>
      {result && (
        <div className="flex items-center gap-4">
          <p className="text-lg font-semibold">
            Landed on: <span className="text-yellow-400">{result}</span>
          </p>
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
      )}
    </div>
  )
}

export default WheelControl
