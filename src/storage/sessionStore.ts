import { get, set, del, keys } from 'idb-keyval'
import { Session } from '../types'

const SESSION_PREFIX = 'session:'
const SESSION_LIST_KEY = 'session-list'

interface SessionMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

/**
 * Save a full session (metadata + audio data) to IndexedDB.
 */
export async function saveSession(session: Session): Promise<void> {
  // Store the full session data
  await set(SESSION_PREFIX + session.id, session)

  // Update the session list (lightweight metadata for browsing)
  const list = await getSessionList()
  const existing = list.findIndex(s => s.id === session.id)
  const meta: SessionMeta = {
    id: session.id,
    name: session.name,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
  if (existing >= 0) {
    list[existing] = meta
  } else {
    list.unshift(meta)
  }
  await set(SESSION_LIST_KEY, list)
}

/**
 * Load a session by ID.
 */
export async function loadSession(id: string): Promise<Session | null> {
  const session = await get<Session>(SESSION_PREFIX + id)
  return session ?? null
}

/**
 * Get the list of saved sessions (metadata only, no audio data).
 */
export async function getSessionList(): Promise<SessionMeta[]> {
  const list = await get<SessionMeta[]>(SESSION_LIST_KEY)
  return list ?? []
}

/**
 * Delete a session from IndexedDB.
 */
export async function deleteSession(id: string): Promise<void> {
  await del(SESSION_PREFIX + id)
  const list = await getSessionList()
  const updated = list.filter(s => s.id !== id)
  await set(SESSION_LIST_KEY, updated)
}

/**
 * Rename a session.
 */
export async function renameSession(id: string, name: string): Promise<void> {
  const session = await loadSession(id)
  if (!session) return
  session.name = name
  session.updatedAt = Date.now()
  await saveSession(session)
}
