import { useEffect, useState } from 'react'
import { getPlayers, createPlayer, updatePlayer, deletePlayer } from '../../../services/playerService'
import { formatKlaava } from '../../../utils/formatters'

const emptyForm = { name: '', klaava: 500, rfid: '' }

function PlayersView() {
  const [players, setPlayers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newForm, setNewForm] = useState(emptyForm)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    getPlayers().then(setPlayers)
  }, [])

  function startEdit(player) {
    setEditingId(player.id)
    setEditForm({ name: player.name, klaava: player.klaava, rfid: player.rfid ?? '' })
  }

  async function saveEdit(id) {
    const updated = await updatePlayer(id, {
      name: editForm.name,
      klaava: Number(editForm.klaava),
      rfid: editForm.rfid || null,
    })
    setPlayers(players.map((p) => (p.id === id ? updated : p)))
    setEditingId(null)
  }

  async function handleDelete(id) {
    await deletePlayer(id)
    setPlayers(players.filter((p) => p.id !== id))
  }

  async function handleAdd() {
    const created = await createPlayer({
      name: newForm.name,
      klaava: Number(newForm.klaava),
      rfid: newForm.rfid || null,
    })
    setPlayers([...players, created])
    setNewForm(emptyForm)
    setShowAdd(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Players</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded"
        >
          + Add player
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-800 rounded-xl p-4 mb-6 flex gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="newName" className="text-xs text-gray-400">Name</label>
            <input
              id="newName"
              className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="newKlaava" className="text-xs text-gray-400">Klaava</label>
            <input
              id="newKlaava"
              type="number"
              className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white w-24"
              value={newForm.klaava}
              onChange={(e) => setNewForm({ ...newForm, klaava: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="newRfid" className="text-xs text-gray-400">RFID</label>
            <input
              id="newRfid"
              className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white"
              value={newForm.rfid}
              placeholder="optional"
              onChange={(e) => setNewForm({ ...newForm, rfid: e.target.value })}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newForm.name}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
          >
            Save
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="text-gray-400 hover:text-white text-sm px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="pb-2">Name</th>
            <th className="pb-2">Klaava</th>
            <th className="pb-2">RFID</th>
            <th className="pb-2">Status</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-b border-gray-800">
              <td className="py-3 pr-4">
                {editingId === player.id ? (
                  <input
                    className="bg-gray-700 rounded px-2 py-1 text-white w-full"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                ) : (
                  player.name
                )}
              </td>
              <td className="py-3 pr-4">
                {editingId === player.id ? (
                  <input
                    type="number"
                    className="bg-gray-700 rounded px-2 py-1 text-white w-24"
                    value={editForm.klaava}
                    onChange={(e) => setEditForm({ ...editForm, klaava: e.target.value })}
                  />
                ) : (
                  <span className="text-green-400">{formatKlaava(player.klaava)}</span>
                )}
              </td>
              <td className="py-3 pr-4">
                {editingId === player.id ? (
                  <input
                    className="bg-gray-700 rounded px-2 py-1 text-white"
                    value={editForm.rfid}
                    placeholder="optional"
                    onChange={(e) => setEditForm({ ...editForm, rfid: e.target.value })}
                  />
                ) : (
                  <span className="text-gray-400">{player.rfid ?? '—'}</span>
                )}
              </td>
              <td className="py-3 pr-4">
                {player.eliminated
                  ? <span className="text-red-400">Eliminated</span>
                  : <span className="text-gray-400">Active</span>
                }
              </td>
              <td className="py-3 flex gap-2 justify-end">
                {editingId === player.id ? (
                  <>
                    <button onClick={() => saveEdit(player.id)} className="text-green-400 hover:text-green-300 text-xs">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white text-xs">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(player)} className="text-indigo-400 hover:text-indigo-300 text-xs">Edit</button>
                    <button onClick={() => handleDelete(player.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PlayersView
