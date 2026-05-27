import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DisplayView from './views/display/DisplayView'
import AdminView from './views/admin/AdminView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<DisplayView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
