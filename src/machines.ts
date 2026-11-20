/** The recorders you can switch between. Each is its own component with its own engine and its own tapes. */
export const MACHINES = [
  { id: 'porta', name: 'Porta Four · 4-track cassette' },
  { id: 'braun-tg60', name: 'Braun TG 60 · reel-to-reel, 1965' },
] as const

export type MachineId = (typeof MACHINES)[number]['id']

const STORAGE_KEY = 'recorder-machine'

export function loadMachine(): MachineId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (MACHINES.some(machine => machine.id === saved)) return saved as MachineId
  } catch { /* storage unavailable */ }
  return 'porta'
}

export function saveMachine(id: MachineId) {
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* storage unavailable */ }
}
