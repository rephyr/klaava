import { NavLink, Outlet, useNavigate } from 'react-router-dom'

function AdminView() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">

      <aside className="w-48 bg-gray-900 flex flex-col p-4 gap-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Admin</p>
        <NavLink
          to="/admin/lobby"
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          Lobby
        </NavLink>
        <NavLink
          to="/admin/players"
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          Players
        </NavLink>
        <NavLink
          to="/admin/game-control"
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          Game Control
        </NavLink>
        <NavLink
          to="/admin/games"
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          Games
        </NavLink>
        <NavLink
          to="/admin/shop"
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          Shop
        </NavLink>
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          Settings
        </NavLink>
        <div className="mt-auto">
          <button
            onClick={() => navigate('/display')}
            className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800"
          >
            ← Display
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>

    </div>
  )
}

export default AdminView
