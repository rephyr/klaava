function BankruptcyOverlay({ players }) {
  return (
    <div
      style={{ animation: 'fadeUp 0.3s ease-out' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10"
    >
      {/* dark red vignette background */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-red-950/40" />

      <div className="relative flex flex-col items-center gap-8">
        <p
          className="text-9xl"
          style={{ animation: 'popIn 0.5s ease-out 0.1s both' }}
        >
          💸
        </p>

        <div className="flex flex-col items-center gap-2">
          {players.map((p, i) => (
            <p
              key={p.id}
              className="text-7xl font-black text-white leading-none"
              style={{ animation: `slamIn 0.55s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.15}s both` }}
            >
              {p.name}
            </p>
          ))}
        </div>

        <p
          className="text-2xl font-black text-red-500 tracking-[0.3em] uppercase"
          style={{ animation: 'stamped 0.5s ease-out 0.5s both' }}
        >
          Bankrupt
        </p>
      </div>
    </div>
  )
}

export default BankruptcyOverlay
