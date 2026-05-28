import apiFetch from './api'

export function createBackup() {
  return apiFetch('/backup/', { method: 'POST' })
}

export function restoreBackup() {
  return apiFetch('/backup/restore', { method: 'POST' })
}
