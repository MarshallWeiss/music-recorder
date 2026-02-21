/**
 * YIN pitch detection algorithm.
 * Detects fundamental frequency from time-domain audio samples.
 *
 * References:
 * - "YIN, a fundamental frequency estimator for speech and music"
 *   (de Cheveigné & Kawahara, 2002)
 */

const YIN_THRESHOLD = 0.15 // Lower = stricter pitch detection, fewer false positives

/**
 * Detect the fundamental frequency of an audio signal.
 * @param buffer Time-domain audio samples (Float32Array from AnalyserNode)
 * @param sampleRate Audio sample rate (e.g., 44100)
 * @returns Detected frequency in Hz, or null if no clear pitch found
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const halfLen = Math.floor(buffer.length / 2)

  // Step 1: Compute the difference function
  const diff = new Float32Array(halfLen)
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau]
      sum += delta * delta
    }
    diff[tau] = sum
  }

  // Step 2: Cumulative mean normalized difference function (CMNDF)
  const cmndf = new Float32Array(halfLen)
  cmndf[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += diff[tau]
    cmndf[tau] = diff[tau] * tau / runningSum
  }

  // Step 3: Absolute threshold — find first tau where cmndf dips below threshold
  let tau = 2 // Start at 2 to skip trivial zero-lag
  while (tau < halfLen) {
    if (cmndf[tau] < YIN_THRESHOLD) {
      // Walk past the dip to find the minimum
      while (tau + 1 < halfLen && cmndf[tau + 1] < cmndf[tau]) {
        tau++
      }
      break
    }
    tau++
  }

  if (tau === halfLen) return null // No pitch found

  // Step 4: Parabolic interpolation for sub-sample accuracy
  const s0 = cmndf[tau - 1] ?? cmndf[tau]
  const s1 = cmndf[tau]
  const s2 = cmndf[tau + 1] ?? cmndf[tau]
  const adjustment = (s0 - s2) / (2 * (s0 - 2 * s1 + s2))
  const refinedTau = tau + (isFinite(adjustment) ? adjustment : 0)

  const frequency = sampleRate / refinedTau

  // Sanity check: allow 20Hz to 5000Hz (covers bass guitar to high harmonics)
  if (frequency < 20 || frequency > 5000) return null

  return frequency
}

// Standard 12-TET note names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface NoteInfo {
  note: string       // e.g. "A4", "C#3"
  noteName: string   // e.g. "A", "C#"
  octave: number     // e.g. 4
  frequency: number  // exact frequency of the nearest note
  centsOff: number   // -50 to +50, deviation from nearest note
}

/**
 * Standard tuning: maps frequency to nearest 12-TET note.
 * Accepts a reference pitch (default A4=440Hz) for future tuning support.
 */
export function frequencyToNote(frequency: number, referenceA4 = 440): NoteInfo {
  // MIDI note number: A4 = 69
  const noteNumber = 12 * Math.log2(frequency / referenceA4) + 69
  const roundedNote = Math.round(noteNumber)

  // Cents deviation: 100 cents = 1 semitone
  const centsOff = Math.round((noteNumber - roundedNote) * 100)

  const noteIndex = ((roundedNote % 12) + 12) % 12
  const octave = Math.floor(roundedNote / 12) - 1
  const noteName = NOTE_NAMES[noteIndex]

  // Exact frequency of the nearest note
  const exactFrequency = referenceA4 * Math.pow(2, (roundedNote - 69) / 12)

  return {
    note: `${noteName}${octave}`,
    noteName,
    octave,
    frequency: exactFrequency,
    centsOff,
  }
}
