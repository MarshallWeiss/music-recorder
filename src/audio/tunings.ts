export interface Tuning {
  name: string
  shortName: string // for compact display
  strings: string[] // note names from low to high, e.g. ["E2", "A2", "D3", "G3", "B3", "E4"]
}

export const TUNINGS: Tuning[] = [
  {
    name: 'Chromatic',
    shortName: 'CHR',
    strings: [], // no target strings — pure chromatic mode
  },
  {
    name: 'Standard',
    shortName: 'STD',
    strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  },
  {
    name: 'Drop D',
    shortName: 'DRP D',
    strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  },
  {
    name: 'Open G',
    shortName: 'OPN G',
    strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
  },
  {
    name: 'Open D',
    shortName: 'OPN D',
    strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
  },
  {
    name: 'DADGAD',
    shortName: 'DADGAD',
    strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
  },
  {
    name: 'Half Step Down',
    shortName: '½ DOWN',
    strings: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'],
  },
  {
    name: 'Full Step Down',
    shortName: '1 DOWN',
    strings: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  },
]

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
