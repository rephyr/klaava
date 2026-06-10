import { useEffect, useState } from 'react'
import { getSettings } from '../../../services/settingsService'
import { loanTiers } from '../../../services/loanService'
import { formatKlaava } from '../../../utils/formatters'
import loanSharkImg from '../../../assets/loanShark.png'

const TIER_COLORS = [
  { bg: 'bg-gray-800', border: 'border-gray-600', badge: 'bg-gray-700 text-gray-300' },
  { bg: 'bg-yellow-950', border: 'border-yellow-700', badge: 'bg-yellow-800 text-yellow-200' },
  { bg: 'bg-orange-950', border: 'border-orange-700', badge: 'bg-orange-800 text-orange-200' },
  { bg: 'bg-red-950', border: 'border-red-700', badge: 'bg-red-800 text-red-200' },
]

function BrokeView({ players, settings }) {
  const names = players.map((p) => p.name)
  const tiers = settings ? loanTiers(settings.maxBet, settings.loanInterestRate) : []

  return (
    <div className="flex w-full h-full items-center justify-center gap-12 px-16">
      {/* Left: loanshark + broke players */}
      <div className="flex flex-col items-center gap-6 shrink-0">
        <img src={loanSharkImg} alt="Loan Shark" className="w-64 h-64 object-contain" style={{ animation: 'popIn 0.4s ease-out' }} />
        <div className="flex flex-col items-center gap-1">
          <p className="text-gray-500 text-xs uppercase tracking-widest">Out of Klaava</p>
          {names.map((name) => (
            <p key={name} className="text-5xl font-black text-red-400" style={{ animation: 'popIn 0.4s ease-out' }}>
              {name}
            </p>
          ))}
        </div>
        <p className="text-gray-400 text-lg text-center leading-relaxed">
          I can help you out…<br />
          <span className="text-gray-600 text-sm">for the right price.</span>
        </p>
      </div>

      {/* Right: 4 loan offer cards */}
      <div className="flex flex-col gap-3 flex-1 max-w-lg">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Choose your deal</p>
        {tiers.map((tier, i) => {
          const colors = TIER_COLORS[i]
          const repayment = Math.round(tier.amount * (1 + tier.rate))
          return (
            <div
              key={tier.label}
              style={{ animation: `fadeUp 0.4s ease-out ${i * 0.1}s both` }}
              className={`rounded-2xl px-5 py-4 border ${colors.bg} ${colors.border} flex items-center gap-4`}
            >
              <div className="flex-1">
                <p className="text-xl font-black text-white">{tier.label}</p>
                <p className="text-3xl font-black text-green-400 mt-0.5">{formatKlaava(tier.amount)}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.badge}`}>
                  {(tier.rate * 100).toFixed(0)}% interest
                </span>
                <p className="text-gray-500 text-xs mt-1.5">
                  repay <span className="text-red-400 font-semibold">{formatKlaava(repayment)}</span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DebtView({ debtors }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <img
        src={loanSharkImg}
        alt="Loan Shark"
        className="w-60 h-60 object-contain"
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
                  <p className="text-red-400 font-black text-sm uppercase tracking-wide">⚠️ Pay now</p>
                ) : (
                  <p className="text-gray-500 text-sm">{roundsLeft} round{roundsLeft !== 1 ? 's' : ''} left</p>
                )}
                <p className="text-gray-600 text-xs mt-0.5">{maxTurns}/3 turns</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
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
      className="fixed inset-0 bg-slate-800 flex flex-col items-center justify-center z-50 gap-8"
    >
      {isDebtMode
        ? <DebtView debtors={debtors} />
        : <BrokeView players={players ?? []} settings={settings} />
      }
    </div>
  )
}

export default LoansharkOverlay
