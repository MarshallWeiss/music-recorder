export interface Tuning {
  name: string
  shortName: string // for compact display
  strings: string[] // note names from low to high, e.g. ["E2", "A2", "D3", "G3", "B3", "E4"]
  group: 'standard' | 'drop' | 'open' | 'other' | 'custom'
}

export const TUNING_GROUPS: { key: Tuning['group']; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'drop', label: 'Drop' },
  { key: 'open', label: 'Open' },
  { key: 'other', label: 'Other' },
  { key: 'custom', label: 'Custom' },
]

export const TUNINGS: Tuning[] = [
  // Standard
  {
    name: 'Chromatic',
    shortName: 'CHR',
    strings: [],
    group: 'standard',
  },
  {
    name: 'Standard',
    shortName: 'STD',
    strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    group: 'standard',
  },
  {
    name: 'Half Step Down',
    shortName: '½ DOWN',
    strings: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'],
    group: 'standard',
  },
  {
    name: 'Full Step Down',
    shortName: '1 DOWN',
    strings: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
    group: 'standard',
  },

  // Drop
  {
    name: 'Drop D',
    shortName: 'DRP D',
    strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    group: 'drop',
  },
  {
    name: 'Drop C#',
    shortName: 'DRP C#',
    strings: ['C#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'],
    group: 'drop',
  },
  {
    name: 'Drop C',
    shortName: 'DRP C',
    strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
    group: 'drop',
  },
  {
    name: 'Drop B',
    shortName: 'DRP B',
    strings: ['B1', 'F#2', 'B2', 'E3', 'G#3', 'C#4'],
    group: 'drop',
  },
  {
    name: 'Double Drop D',
    shortName: 'DBL D',
    strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'D4'],
    group: 'drop',
  },

  // Open
  {
    name: 'Open G',
    shortName: 'OPN G',
    strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    group: 'open',
  },
  {
    name: 'Open D',
    shortName: 'OPN D',
    strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
    group: 'open',
  },
  {
    name: 'Open E',
    shortName: 'OPN E',
    strings: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
    group: 'open',
  },
  {
    name: 'Open A',
    shortName: 'OPN A',
    strings: ['E2', 'A2', 'E3', 'A3', 'C#4', 'E4'],
    group: 'open',
  },
  {
    name: 'Open C',
    shortName: 'OPN C',
    strings: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'],
    group: 'open',
  },

  // Other
  {
    name: 'DADGAD',
    shortName: 'DADGAD',
    strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
    group: 'other',
  },
  {
    name: 'Nashville',
    shortName: 'NASH',
    strings: ['E3', 'A3', 'D4', 'G4', 'B3', 'E4'],
    group: 'other',
  },
]

export function getTuningsByGroup(tunings: Tuning[]): Map<string, Tuning[]> {
  const map = new Map<string, Tuning[]>()
  for (const t of tunings) {
    const list = map.get(t.group) || []
    list.push(t)
    map.set(t.group, list)
  }
  return map
}

export function isValidNoteString(note: string): boolean {
  return /^[A-G]#?\d$/.test(note)
}

/**
 * Find the closest target string for a detected note within a tuning.
 * Returns the string note name and the cents offset from it, or null if chromatic mode.
 */
export function findClosestString(
  detectedNote: string,
  detectedFrequency: number,
  tuning: Tuning,
): { stringNote: string; stringIndex: number } | null {
  if (tuning.strings.length === 0) return null

  // Parse note name and octave from detected note (e.g. "A4" -> "A", 4)
  const match = detectedNote.match(/^([A-G]#?)(\d+)$/)
  if (!match) return null

  const detectedMidi = noteToMidi(detectedNote)
  if (detectedMidi === null) return null

  let closestIndex = 0
  let closestDistance = Infinity

  for (let i = 0; i < tuning.strings.length; i++) {
    const stringMidi = noteToMidi(tuning.strings[i])
    if (stringMidi === null) continue
    const distance = Math.abs(detectedMidi - stringMidi)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = i
    }
  }

  return {
    stringNote: tuning.strings[closestIndex],
    stringIndex: closestIndex,
  }
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
}

function noteToMidi(note: string): number | null {
  const match = note.match(/^([A-G]#?)(-?\d+)$/)
  if (!match) return null
  const semitone = NOTE_TO_SEMITONE[match[1]]
  if (semitone === undefined) return null
  const octave = parseInt(match[2])
  return (octave + 1) * 12 + semitone
}
