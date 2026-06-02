import { useEffect, useState } from 'react'
import { getSession } from '../../../services/gameService'
import { getLoansByPlayer } from '../../../services/loanService'
import { formatKlaava } from '../../../utils/formatters'

function LoanView() {
  const [players, setPlayers] = useState([])
  const [loans, setLoans] = useState({})

  useEffect(() => {
    load()
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [])

  async function load() {
    const session = await getSession().catch(() => null)
    if (!session) return
    const active = session.players.filter((p) => !p.eliminated)
    setPlayers(active)
    const loanMap = {}
    await Promise.all(
      active.map(async (p) => {
        loanMap[p.id] = await getLoansByPlayer(p.id)
      })
    )
    setLoans(loanMap)
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      <p className="text-gray-400 text-sm uppercase tracking-widest">Loans</p>

      <div className="grid grid-cols-2 gap-4 w-full">
        {players.map((player) => {
          const playerLoans = loans[player.id] ?? []
          const totalOwed = playerLoans.reduce((sum, l) => sum + l.amountOwed, 0)
          const hasLoans = playerLoans.length > 0

          return (
            <div
              key={player.id}
              className={`rounded-2xl p-5 flex flex-col gap-3 ${hasLoans ? 'bg-red-950 border border-red-800' : 'bg-gray-800'}`}
            >
              <div className="flex justify-between items-start">
                <p className="text-2xl font-bold">{player.name}</p>
                <p className="text-xl font-semibold text-green-400">{formatKlaava(player.klaava)}</p>
              </div>

              {hasLoans ? (
                <div className="flex flex-col gap-2">
                  {playerLoans.map((loan) => (
                    <div key={loan.id} className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        Loan {formatKlaava(loan.amount)} · {(loan.interestRate * 100).toFixed(0)}% interest
                      </span>
                      <span className="text-red-300 font-semibold">owes {formatKlaava(loan.amountOwed)}</span>
                    </div>
                  ))}
                  {playerLoans.length > 1 && (
                    <div className="flex justify-between text-sm border-t border-red-800 pt-2 mt-1">
                      <span className="text-gray-400">Total</span>
                      <span className="text-red-300 font-bold">{formatKlaava(totalOwed)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No active loans</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LoanView
