import { useEffect, useState } from 'react'
import { getSettings } from '../../../services/settingsService'
import { formatKlaava } from '../../../utils/formatters'
import loanSharkImg from '../../../assets/loanShark.png'

// Broke mode: player(s) just hit 0 klaava mid-game
function BrokeView({ players, settings }) {
  const names = players.map((p) => p.name)
  return (
    <>
      <img src={loanSharkImg} alt="Loan Shark" className="w-72 h-72 object-contain" />

      <div className="text-center flex flex-col gap-2">
        <p className="text-gray-500 text-xs uppercase tracking-widest">Out of Klaava</p>
        <div className="flex flex-col gap-1">
          {names.map((name) => (
            <p
              key={name}
              style={{ animation: 'popIn 0.4s ease-out' }}
              className="text-6xl font-black text-red-400"
            >
              {name}
            </p>
          ))}
        </div>
      </div>

      <p className="text-2xl text-gray-300 text-center leading-relaxed">
        {names.length === 1 ? "You're broke." : "You're both broke."}<br />
        <span className="text-gray-500">Take a loan to stay in the game.</span>
      </p>

      {settings && (
        <div className="flex gap-6 text-sm text-gray-600">
          <span>Max loan: <span className="text-gray-400">{formatKlaava(settings.maxLoanAmount)}</span></span>
          <span>Interest: <span className="text-gray-400">{(settings.loanInterestRate * 100).toFixed(0)}%</span></span>
        </div>
      )}
    </>
  )
}

// End-of-round mode: show all debtors with their loan status
function DebtView({ debtors }) {
  return (
    <>
      <img
        src={loanSharkImg}
        alt="Loan Shark"
        className="w-72 h-72 object-contain"
        style={{ animation: 'popIn 0.5s ease-out' }}
      />

      <div className="text-center">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">End of Round</p>
        <p className="text-2xl font-bold text-white">Outstanding Debts</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {debtors.map(({ player, loans }, i) => {
          const totalOwed = loans.reduce((s, l) => s + l.amountOwed, 0)
          const maxTurns = Math.max(...loans.map((l) => l.turnsActive))
          const roundsLeft = 2 - maxTurns
          const isFinal = roundsLeft <= 0

          return (
            <div
              key={player.id}
              style={{ animation: `fadeUp 0.4s ease-out ${i * 0.1}s both` }}
              className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${
                isFinal ? 'bg-red-950 border border-red-700' : 'bg-gray-800'
              }`}
            >
              <div className="flex-1">
                <p className={`text-2xl font-black ${isFinal ? 'text-red-400' : 'text-white'}`}>
                  {player.name}
                </p>
                <p className="text-gray-400 text-sm mt-0.5">
                  owes <span className="text-red-400 font-semibold">{formatKlaava(totalOwed)}</span>
                </p>
              </div>

              <div className="text-right">
                {isFinal ? (
                  <p className="text-red-400 font-black text-sm uppercase tracking-wide">
                    ⚠️ Pay now
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {roundsLeft} round{roundsLeft !== 1 ? 's' : ''} left
                  </p>
                )}
                <p className="text-gray-600 text-xs mt-0.5">{maxTurns}/3 turns</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function LoansharkOverlay({ players, debtors }) {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {})
  }, [])

  const isDebtMode = debtors && debtors.length > 0

  return (
    <div
      style={{ animation: 'fadeUp 0.4s ease-out' }}
      className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 gap-8"
    >
      {isDebtMode
        ? <DebtView debtors={debtors} />
        : <BrokeView players={players ?? []} settings={settings} />
      }
    </div>
  )
}

export default LoansharkOverlay
