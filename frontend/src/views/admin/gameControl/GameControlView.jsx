import { useEffect, useState } from 'react'
import { getGameState, getSession, advanceGame, endGame, addPlayerToSession } from '../../../services/gameService'
import { getPlayers } from '../../../services/playerService'
import { getGames } from '../../../services/gamesService'
import BlackjackControl from '../blackjack/BlackjackControl'
import HiLoControl from '../hiLo/HiLoControl'
import WheelControl from '../wheel/WheelControl'
import KlaavaTransfer from '../transfer/KlaavaTransfer'
import RouletteControl from '../roulette/RouletteControl'
import MinigameControl from '../minigame/MinigameControl'
import AuctionControl from '../auction/AuctionControl'
import RoundFlowBar from './RoundFlowBar'
import EndRoundPanel from '../endRound/EndRoundPanel'
import { formatKlaava } from '../../../utils/formatters'

const GAME_CONTROLS = [
  { id: 'hiLo', label: 'Hi-Lo' },
  { id: 'blackjack', label: 'Blackjack' },
  { id: 'roulette', label: 'Roulette' },
  { id: 'auction', label: 'Auction' },
]

const GAME_NAME_TO_PHASE = { ...Object.fromEntries(GAME_CONTROLS.map((g) => [g.label, g.id])), 'Ravit': 'ravit' }
const GAME_PHASES = new Set([...GAME_CONTROLS.map((g) => g.id), 'gambling', 'ravit'])

const ALL_PHASES = ['wheel', 'hiLo', 'blackjack', 'roulette', 'auction', 'ravit', 'shop', 'minigame', 'endRound', 'loans', 'gambling', 'result']

const TABS = ['wheel', 'game', 'minigame', 'transfer']

function GameControlView() {
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [games, setGames] = useState([])
  const [selectedTab, setSelectedTab] = useState('wheel')
  const [selectedGame, setSelectedGame] = useState(null)
  const [wheelWinner, setWheelWinner] = useState(null)

  useEffect(() => {
    getGameState().then(setGameState)
    getGames().then(setGames)
    getPlayers().then((all) => setAllPlayers(all.filter((p) => !p.eliminated)))
  }, [])

  useEffect(() => {
    if (gameState?.sessionId) {
      getSession().then((s) => setPlayers(s.players.filter((p) => !p.eliminated)))
    }
  }, [gameState?.sessionId, gameState?.phase])

  useEffect(() => {
    setWheelWinner(null)
    setSelectedTab('wheel')
  }, [gameState?.round])

  async function handleAdvance(data) {
    const updated = await advanceGame(data)
    setGameState((prev) => ({ ...prev, ...updated }))
  }

  async function handleEndGame() {
    const result = await endGame()
    setGameState((prev) => ({ ...prev, phase: result.phase }))
  }

  function refreshPlayers() {
    getSession().then((s) => setPlayers(s.players.filter((p) => !p.eliminated)))
    getPlayers().then((all) => setAllPlayers(all.filter((p) => !p.eliminated)))
  }

  async function handleAddPlayer(playerId) {
    await addPlayerToSession(playerId)
    refreshPlayers()
  }

  function refreshGames() {
    getGames().then(setGames)
  }

  function getNextPhaseInfo() {
    const phase = gameState?.phase
    if (phase === 'wheel') {
      if (!wheelWinner) return null
      const next = GAME_NAME_TO_PHASE[wheelWinner]
      return next ? { label: `→ ${wheelWinner}`, phase: next } : null
    }
    if (GAME_PHASES.has(phase)) return { label: '→ Shop', phase: 'shop' }
    if (phase === 'shop') return { label: '→ Minigame', phase: 'minigame' }
    if (phase === 'minigame') return { label: '→ End Round', phase: 'endRound' }
    return null
  }

  if (!gameState?.sessionId) {
    return <p className="text-gray-400 text-sm">No active game session. Start a game from the lobby first.</p>
  }

  const phase = gameState.phase
  const isSitAndGo = gameState.gameMode === 'sit_and_go'
  const nextPhaseInfo = getNextPhaseInfo()
  const nextMinBet = Math.round(gameState.minBet * gameState.betMultiplier)
  const nextMaxBet = Math.round(gameState.maxBet * gameState.betMultiplier)
  const sessionPlayerIds = new Set(players.map((p) => p.id))
  const addablePlayers = allPlayers.filter((p) => !sessionPlayerIds.has(p.id))

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Game Control</h2>

      <RoundFlowBar phase={phase} />

      {players.length === 1 && phase !== 'finished' && !isSitAndGo && (
        <div className="bg-yellow-900 border border-yellow-700 rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-yellow-300">Last player standing</p>
            <p className="text-yellow-400 text-sm">{players[0]?.name} wins!</p>
          </div>
          <button
            onClick={() => handleAdvance({ phase: 'finished' })}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-5 py-2 rounded-lg"
          >
            Show Winner Screen
          </button>
        </div>
      )}

      {isSitAndGo && addablePlayers.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Add player</p>
          <div className="flex gap-2 flex-wrap">
            {addablePlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAddPlayer(p.id)}
                className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-3 py-1.5 rounded"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'finished' && !isSitAndGo && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
          <p className="text-gray-300 text-sm">Winner screen is live on display</p>
          <button
            onClick={handleEndGame}
            className="bg-red-800 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg"
          >
            End Game &amp; Save Results
          </button>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-4 mb-6 flex gap-8 items-center text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-1">Phase</p>
          <p className="capitalize font-semibold">{phase}</p>
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
        {nextPhaseInfo && (
          <button
            onClick={() => handleAdvance({ phase: nextPhaseInfo.phase })}
            className="ml-auto bg-green-700 hover:bg-green-600 text-white text-sm px-5 py-2 rounded-lg font-semibold"
          >
            {nextPhaseInfo.label}
          </button>
        )}
      </div>

      {phase === 'endRound' && (
        <section className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">End of Round</p>
          <div className="bg-gray-900 rounded-2xl p-5">
            <EndRoundPanel
              players={players}
              onNextRound={() => handleAdvance({ nextRound: true, phase: 'wheel' })}
              refreshPlayers={refreshPlayers}
            />
          </div>
        </section>
      )}

      <div className="flex gap-1 mb-0 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              selectedTab === tab
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-b-2xl rounded-tr-2xl p-5 mb-8">
        {selectedTab === 'wheel' && (
          <WheelControl
            key={gameState?.round}
            onPhaseChange={(p) => handleAdvance({ phase: p })}
            games={games}
            onWheelResult={(winner) => {
              setWheelWinner(winner)
              const phaseId = GAME_NAME_TO_PHASE[winner]
              if (phaseId) setSelectedGame(phaseId)
            }}
            onGamesChanged={refreshGames}
            onStartGame={(phaseId) => {
              if (phaseId === 'ravit') {
                setSelectedTab('minigame')
              } else {
                setSelectedGame(phaseId)
                setSelectedTab('game')
              }
            }}
          />
        )}

        {selectedTab === 'game' && (
          <div className="flex flex-col gap-5">
            <div className="flex gap-2 flex-wrap">
              {GAME_CONTROLS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGame(g.id)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    selectedGame === g.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {selectedGame === 'hiLo' && (
              <HiLoControl
                players={players}
                gameState={gameState}
                onPhaseChange={(p) => handleAdvance({ phase: p })}
                refreshPlayers={refreshPlayers}
              />
            )}
            {selectedGame === 'blackjack' && (
              <BlackjackControl
                players={players}
                defaultBet={gameState.minBet}
                onStateChange={(p) => handleAdvance({ phase: p })}
                refreshPlayers={refreshPlayers}
              />
            )}
            {selectedGame === 'roulette' && (
              <RouletteControl
                players={players}
                gameState={gameState}
                onPhaseChange={(p) => handleAdvance({ phase: p })}
                refreshPlayers={refreshPlayers}
              />
            )}
            {selectedGame === 'auction' && (
              <AuctionControl
                players={players}
                gameState={gameState}
                onPhaseChange={(p) => handleAdvance({ phase: p })}
                refreshPlayers={refreshPlayers}
              />
            )}
            {!selectedGame && (
              <p className="text-gray-500 text-sm">Select a game above to see controls.</p>
            )}
          </div>
        )}

        {selectedTab === 'minigame' && (
          <MinigameControl
            players={players}
            gameState={gameState}
            refreshPlayers={refreshPlayers}
            onPhaseChange={(p) => handleAdvance({ phase: p })}
          />
        )}

        {selectedTab === 'transfer' && (
          <KlaavaTransfer
            players={players}
            setPlayers={setPlayers}
            gameState={gameState}
          />
        )}
      </div>

      <section className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Override phase</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_PHASES.map((p) => (
            <button
              key={p}
              onClick={() => handleAdvance({ phase: p })}
              className={`px-3 py-1.5 rounded text-xs capitalize font-medium transition-colors ${
                phase === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="flex gap-3 flex-wrap">
        <button
          onClick={() => handleAdvance({ nextLevel: true })}
          className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded"
        >
          Next level — bets become {formatKlaava(nextMinBet)} / {formatKlaava(nextMaxBet)}
        </button>
        <button
          onClick={handleEndGame}
          className="bg-red-900 hover:bg-red-800 text-red-300 text-sm px-4 py-2 rounded"
        >
          End Game
        </button>
      </section>
    </div>
  )
}

export default GameControlView
