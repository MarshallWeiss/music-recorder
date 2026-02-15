export interface Track {
  id: number
  name: string
  audioBuffer: AudioBuffer | null
  volume: number       // 0 to 1
  pan: number          // -1 to 1
  muted: boolean
  solo: boolean
  isRecording: boolean
  isArmed: boolean
}

export interface Session {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  loopDuration: number // seconds (0 = no loop set)
  sampleRate: number
  bpm: number
  tracks: SerializedTrack[]
}

export interface SerializedTrack {
  id: number
  name: string
  audioData: number[][] | null // channel data as plain arrays (for IndexedDB storage)
  volume: number
  pan: number
  muted: boolean
  solo: boolean
}

export const NUM_TRACKS = 4

export const DEFAULT_TRACKS: Track[] = Array.from({ length: NUM_TRACKS }, (_, i) => ({
  id: i,
  name: `Track ${i + 1}`,
  audioBuffer: null,
  volume: 1.0,
  pan: 0,
  muted: false,
  solo: false,
  isRecording: false,
  isArmed: i === 0, // Track 1 armed by default
}))
