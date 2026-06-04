function ResultView({ gameState }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6">
      <p className="text-gray-400 text-sm uppercase tracking-widest">Round Result</p>
      <p className="text-4xl font-bold text-center max-w-xl">
        {gameState.lastResult ?? 'Round complete'}
      </p>
    </div>
  )
}

export default ResultView
