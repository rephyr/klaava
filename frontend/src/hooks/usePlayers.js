import { useContext } from 'react'
import { GameContext } from '../context/GameContext'

function usePlayers() {
  const { players } = useContext(GameContext)
  return players
}

export default usePlayers
