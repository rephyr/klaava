import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DisplayView from './views/display/DisplayView'
import AdminView from './views/admin/AdminView'
import PlayersView from './views/admin/players/PlayersView'
import SettingsView from './views/admin/settings/SettingsView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<DisplayView />} />
        <Route path="/admin" element={<AdminView />}>
          <Route index element={<Navigate to="/admin/players" replace />} />
          <Route path="players" element={<PlayersView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
