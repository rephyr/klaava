import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DisplayView from './views/display/DisplayView'
import AdminView from './views/admin/AdminView'
import LobbyView from './views/admin/lobby/LobbyView'
import PlayersView from './views/admin/players/PlayersView'
import GameControlView from './views/admin/gameControl/GameControlView'
import GamesView from './views/admin/games/GamesView'
import AdminShopView from './views/admin/shop/AdminShopView'
import SettingsView from './views/admin/settings/SettingsView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<DisplayView />} />
        <Route path="/admin" element={<AdminView />}>
          <Route index element={<Navigate to="/admin/lobby" replace />} />
          <Route path="lobby" element={<LobbyView />} />
          <Route path="game-control" element={<GameControlView />} />
          <Route path="players" element={<PlayersView />} />
          <Route path="games" element={<GamesView />} />
          <Route path="shop" element={<AdminShopView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
