import { useState } from 'react'
import { spinWheel } from '../../../services/gameService'

function WheelControl({ onPhaseChange }) {
  const [result, setResult] = useState(null)

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={async () => {
          const res = await spinWheel()
          await onPhaseChange('wheel')
          setResult(null)
          setTimeout(() => setResult(res.winner), 4500)
        }}
        className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded w-fit"
      >
        Spin wheel
      </button>
      {result && (
        <p className="text-lg font-semibold">
          Landed on: <span className="text-yellow-400">{result}</span>
        </p>
      )}
    </div>
  )
}

export default WheelControl
