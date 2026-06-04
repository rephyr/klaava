const STEPS = [
  { label: 'Wheel',     phases: ['wheel'] },
  { label: 'Game',      phases: ['hiLo', 'blackjack', 'roulette', 'auction', 'gambling'] },
  { label: 'Shop',      phases: ['shop'] },
  { label: 'Minigame',  phases: ['minigame'] },
  { label: 'End Round', phases: ['endRound'] },
]

function RoundFlowBar({ phase }) {
  const activeStep = STEPS.findIndex((s) => s.phases.includes(phase))

  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeStep === i
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-500'
          }`}>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-px ${activeStep > i ? 'bg-indigo-500' : 'bg-gray-700'}`} />
          )}
        </div>
      ))}
      <div className="w-6 h-px bg-gray-700" />
      <span className="text-gray-600 text-sm">↺</span>
    </div>
  )
}

export default RoundFlowBar
