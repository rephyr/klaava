import { useEffect, useState } from 'react'
import { getGameState, getSession, advanceGame, transferKlaava, spinWheel } from '../../../services/gameService'
import { startHiLo, revealCard, nextRound, placeBet } from '../../../services/hiLoService'
import BlackjackControl from '../blackjack/BlackjackControl'
import { formatKlaava } from '../../../utils/formatters'

const PHASES = ['gambling', 'minigame', 'shop', 'result', 'wheel', 'hiLo', 'blackjack']

function GameControlView() {
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [winner, setWinner] = useState('')
  const [loser, setLoser] = useState('')
  const [amount, setAmount] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [hiloResults, setHiloResults] = useState(null)
  const [bets, setBets] = useState({})

  useEffect(() => {
    getGameState().then(setGameState)
  }, [])

  useEffect(() => {
    if (gameState?.sessionId) {
      getSession().then((s) => setPlayers(s.players.filter((p) => !p.eliminated)))
    }
  }, [gameState?.sessionId])

  async function handleAdvance(data) {
    const updated = await advanceGame(data)
    setGameState((prev) => ({ ...prev, ...updated }))
  }

  async function handleTransfer() {
    if (!winner || !loser || !amount || winner === loser) return
    try {
      const result = await transferKlaava(Number(loser), Number(winner), Number(amount))
      setPlayers((prev) => prev.map((p) => {
        if (p.id === result.winner.id) return { ...p, klaava: result.winner.klaava, eliminated: result.winner.eliminated }
        if (p.id === result.loser.id) return { ...p, klaava: result.loser.klaava, eliminated: result.loser.eliminated }
        return p
      }).filter((p) => !p.eliminated))
      setFeedback(`${result.loser.name} paid ${formatKlaava(result.amount)} to ${result.winner.name}`)
      setWinner('')
      setLoser('')
      setAmount('')
    } catch {
      setFeedback('Transfer failed')
    }
    setTimeout(() => setFeedback(null), 4000)
  }

  if (!gameState?.sessionId) {
    return <p className="text-gray-400 text-sm">No active game session. Start a game from the lobby first.</p>
  }

  const nextMinBet = Math.round(gameState.minBet * gameState.betMultiplier)
  const nextMaxBet = Math.round(gameState.maxBet * gameState.betMultiplier)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Game Control</h2>

      <div className="bg-gray-800 rounded-xl p-4 mb-8 flex gap-8 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-1">Phase</p>
          <p className="capitalize font-semibold">{gameState.phase}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Round</p>
          <p className="font-semibold">{gameState.round}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Level</p>
          <p className="font-semibold">{gameState.level}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Min bet</p>
          <p className="font-semibold text-green-400">{formatKlaava(gameState.minBet)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Max bet</p>
          <p className="font-semibold text-green-400">{formatKlaava(gameState.maxBet)}</p>
        </div>
      </div>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Set phase</p>
        <div className="flex gap-2">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => handleAdvance({ phase })}
              className={`px-4 py-2 rounded text-sm capitalize font-medium transition-colors ${
                gameState.phase === phase
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Klaava transfer</p>
        {feedback && <p className="text-green-400 text-sm mb-3">{feedback}</p>}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Loser (pays)</label>
            <select
              value={loser}
              onChange={(e) => setLoser(e.target.value)}
              className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="">Select player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({formatKlaava(p.klaava)})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Winner (receives)</label>
            <select
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="">Select player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({formatKlaava(p.klaava)})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${gameState.minBet} – ${gameState.maxBet}`}
              className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-32"
            />
          </div>
          <button
            onClick={handleTransfer}
            disabled={!winner || !loser || !amount || winner === loser}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
          >
            Transfer
          </button>
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          {players.map((p) => (
            <div key={p.id} className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
              <span className="text-white">{p.name}</span>
              <span className="text-green-400 ml-2">{formatKlaava(p.klaava)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Hi-Lo</p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={async () => {
              await startHiLo()
              await handleAdvance({ phase: 'hiLo' })
              setBets({})
              setHiloResults(null)
            }}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded"
          >
            Start round
          </button>
          <button
            onClick={async () => {
              const state = await revealCard()
              setHiloResults(state.bets)
              getSession().then((s) => setPlayers(s.players.filter((p) => !p.eliminated)))
            }}
            className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
          >
            Reveal
          </button>
          <button
            onClick={async () => {
              await nextRound()
              setBets({})
              setHiloResults(null)
            }}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded"
          >
            Next card
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const bet = bets[player.id] ?? { guess: '', amount: gameState.minBet }
            const result = hiloResults?.find((r) => r.playerId === player.id)
            return (
              <div key={player.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
                <p className="w-24 font-medium text-sm">{player.name}</p>
                <p className="text-green-400 text-sm w-20">{formatKlaava(player.klaava)}</p>
                <div className="flex gap-1">
                  {['higher', 'lower'].map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        const updated = { ...bet, guess: g }
                        setBets((prev) => ({ ...prev, [player.id]: updated }))
                        placeBet(player.id, player.name, g, updated.amount)
                      }}
                      className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-colors ${
                        bet.guess === g
                          ? g === 'higher' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {g === 'higher' ? '⬆ Hi' : '⬇ Lo'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={bet.amount}
                  onChange={(e) => {
                    const updated = { ...bet, amount: Number(e.target.value) }
                    setBets((prev) => ({ ...prev, [player.id]: updated }))
                    if (bet.guess) placeBet(player.id, player.name, bet.guess, updated.amount)
                  }}
                  className="bg-gray-700 rounded px-2 py-1 text-sm text-white w-20"
                />
                {result && (
                  <span className={`text-sm font-bold ${result.result === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                    {result.result === 'correct' ? `✓ CORRECT +${formatKlaava(result.amount)}` : `✗ WRONG -${formatKlaava(result.amount)}`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Blackjack</p>
        <BlackjackControl
          players={players}
          defaultBet={gameState.minBet}
          onStateChange={(phase) => handleAdvance({ phase })}
        />
      </section>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Wheel</p>
        <button
          onClick={async () => {
            const res = await spinWheel()
            await handleAdvance({ phase: 'wheel' })
            setFeedback('Spinning...')
            setTimeout(() => {
              setFeedback(`Wheel landed on: ${res.winner}`)
              setTimeout(() => setFeedback(null), 5000)
            }, 4500)
          }}
          className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded"
        >
          Spin wheel
        </button>
      </section>

      <section className="mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Advance</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleAdvance({ nextRound: true })}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded"
          >
            Next round
          </button>
          <button
            onClick={() => handleAdvance({ nextLevel: true })}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded"
          >
            Next level — bets become {formatKlaava(nextMinBet)} / {formatKlaava(nextMaxBet)}
          </button>
        </div>
      </section>
    </div>
  )
}

export default GameControlView
