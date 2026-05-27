import { createContext, useState } from 'react'

export const GameContext = createContext(null)

function GameProvider({ children }) {
  const [players, setPlayers] = useState([])
  const [gameState, setGameState] = useState(null)

  return (
    <GameContext.Provider value={{ players, setPlayers, gameState, setGameState }}>
      {children}
    </GameContext.Provider>
  )
}

export default GameProvider
