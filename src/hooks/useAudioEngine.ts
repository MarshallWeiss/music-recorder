import { useState, useRef, useEffect, useCallback } from 'react'
import { AudioEngine, AudioDevice } from '../audio/AudioEngine'
import { Track, DEFAULT_TRACKS, NUM_TRACKS } from '../types'

export interface UseAudioEngineReturn {
  // State
  tracks: Track[]
  devices: AudioDevice[]
  selectedDeviceId: string | null
  isRecording: boolean
  isPlaying: boolean
  currentTime: number
  loopDuration: number
  inputGain: number
  bpm: number
  metronomeOn: boolean
  currentBeat: number
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  selectDevice: (deviceId: string) => Promise<void>
  armTrack: (trackId: number) => void
  startRecording: () => void
  stopRecording: () => void
  play: () => void
  stop: () => void
  seekTo: (time: number) => void
  setVolume: (trackId: number, volume: number) => void
  setPan: (trackId: number, pan: number) => void
  toggleMute: (trackId: number) => void
  toggleSolo: (trackId: number) => void
  clearTrack: (trackId: number) => void
  clearAll: () => void
  setInputGain: (gain: number) => void
  renameTrack: (trackId: number, name: string) => void
  setBpm: (bpm: number) => void
  toggleMetronome: () => void
  setTrackOffset: (trackId: number, offset: number) => void

  // Engine ref (for VU meters etc)
  engine: AudioEngine | null
}

export function useAudioEngine(): UseAudioEngineReturn {
  const engineRef = useRef<AudioEngine | null>(null)
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS.map(t => ({ ...t })))
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loopDuration, setLoopDuration] = useState(0)
  const [inputGain, setInputGainState] = useState(1.0)
  const [bpm, setBpmState] = useState(120)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [isInitialized, setIsInitialized] = useState(false)

  // Track state ref for use in callbacks without stale closures
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks
  const loopDurationRef = useRef(loopDuration)
  loopDurationRef.current = loopDuration
  const recordingStartPosRef = useRef(0)

  useEffect(() => {
    const engine = new AudioEngine()
    engineRef.current = engine
    engine.onTimeUpdate = (time) => setCurrentTime(time)
    engine.onBeat = (beat) => setCurrentBeat(beat)
    return () => engine.destroy()
  }, [])

  const initialize = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    await engine.init()
    const deviceList = await engine.enumerateDevices()
    setDevices(deviceList)

    // Auto-select TASCAM if found, otherwise first device
    const tascam = deviceList.find(d => d.label.toLowerCase().includes('us-1x2'))
    const defaultDevice = tascam || deviceList[0]
    if (defaultDevice) {
      await engine.selectDevice(defaultDevice.deviceId)
      setSelectedDeviceId(defaultDevice.deviceId)
    }
    setIsInitialized(true)
  }, [])

  const selectDevice = useCallback(async (deviceId: string) => {
    const engine = engineRef.current
    if (!engine) return
    await engine.selectDevice(deviceId)
    setSelectedDeviceId(deviceId)
  }, [])

  const armTrack = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      isArmed: t.id === trackId,
    })))
  }, [])

  const startRecording = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const armed = tracksRef.current.find(t => t.isArmed)
    if (!armed) return

    // Capture current playhead position for overdub sync
    const hasLoop = loopDurationRef.current > 0
    const currentPos = hasLoop ? engine.getCurrentTime() : 0
    recordingStartPosRef.current = currentPos

    // Build monitor buffers (all tracks except the armed one)
    const monitorBuffers = tracksRef.current
      .filter(t => t.id !== armed.id && t.audioBuffer)
      .map(t => ({
        buffer: t.audioBuffer!,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        startOffset: t.startOffset,
      }))

    setTracks(prev => prev.map(t =>
      t.id === armed.id ? { ...t, isRecording: true } : t,
    ))
    setIsRecording(true)

    engine.startRecording(
      monitorBuffers,
      hasLoop ? loopDurationRef.current : undefined,
      currentPos,
    )

    // Poll for auto-stop (engine sets isCurrentlyRecording = false at loop boundary)
    const interval = setInterval(() => {
      if (!engine.isRecording()) {
        clearInterval(interval)
        // Engine auto-stopped — retrieve the buffer via stopRecording
        const buffer = engine.stopRecording()
        handleRecordingComplete(armed.id, buffer)
      }
    }, 100)

    // Store interval for cleanup
    ;(engine as any)._autoStopInterval = interval
  }, [])

  const handleRecordingComplete = useCallback((trackId: number, buffer: AudioBuffer | null) => {
    const recordStartPos = recordingStartPosRef.current
    setTracks(prev => {
      const updated = prev.map(t =>
        t.id === trackId
          ? {
              ...t,
              isRecording: false,
              audioBuffer: buffer ?? t.audioBuffer,
              // Track 0 (loop source) always starts at 0; overdubs start at their record position
              startOffset: buffer ? (loopDurationRef.current > 0 ? recordStartPos : 0) : t.startOffset,
            }
          : t,
      )

      // If this is Track 0 (first track) and we just set the loop
      if (trackId === 0 && buffer) {
        setLoopDuration(buffer.duration)
      }

      return updated
    })
    setIsRecording(false)
  }, [])

  const stopRecording = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    // Clear auto-stop interval
    if ((engine as any)._autoStopInterval) {
      clearInterval((engine as any)._autoStopInterval)
    }

    const buffer = engine.stopRecording()
    const armed = tracksRef.current.find(t => t.isRecording)
    if (armed) {
      handleRecordingComplete(armed.id, buffer)
    }
  }, [handleRecordingComplete])

  const play = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const trackData = tracksRef.current
      .filter(t => t.audioBuffer)
      .map(t => ({
        buffer: t.audioBuffer!,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        startOffset: t.startOffset,
      }))

    if (trackData.length === 0) return

    // Start from current playhead position (seekTo sets playStartOffset)
    const offset = engine.getCurrentTime()
    engine.playAll(trackData, true, offset)
    setIsPlaying(true)
  }, [])

  const stop = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    // Capture current position before stopping so playhead stays put
    const pos = engine.getCurrentTime()
    engine.stopAllPlayback()
    // Store the position back so play resumes from here
    engine.seekTo(pos)
    setIsPlaying(false)
    setCurrentTime(pos)
  }, [])

  const seekTo = useCallback((time: number) => {
    const engine = engineRef.current
    if (!engine) return
    const newTime = engine.seekTo(time)
    setCurrentTime(newTime)
  }, [])

  const setVolume = useCallback((trackId: number, volume: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, volume } : t,
    ))
    engineRef.current?.setTrackVolume(trackId, volume)
  }, [])

  const setPan = useCallback((trackId: number, pan: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, pan } : t,
    ))
    engineRef.current?.setTrackPan(trackId, pan)
  }, [])

  const toggleMute = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, muted: !t.muted } : t,
    ))
  }, [])

  const toggleSolo = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, solo: !t.solo } : t,
    ))
  }, [])

  const clearTrack = useCallback((trackId: number) => {
    // Stop playback before clearing so stale AudioBufferSourceNodes don't keep playing
    const engine = engineRef.current
    if (engine && engine.isPlaying()) {
      engine.stopAllPlayback()
      setIsPlaying(false)
    }

    setTracks(prev => {
      const updated = prev.map(t =>
        t.id === trackId ? { ...t, audioBuffer: null } : t,
      )
      // If clearing Track 0, clear everything
      if (trackId === 0) {
        setLoopDuration(0)
        setCurrentTime(0)
        return updated.map(t => ({ ...t, audioBuffer: null }))
      }
      return updated
    })
  }, [])

  const renameTrack = useCallback((trackId: number, name: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, name } : t,
    ))
  }, [])

  const setInputGain = useCallback((gain: number) => {
    setInputGainState(gain)
    engineRef.current?.setInputGain(gain)
  }, [])

  const setBpm = useCallback((newBpm: number) => {
    setBpmState(newBpm)
    engineRef.current?.setBpm(newBpm)
  }, [])

  const toggleMetronome = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    if (engine.isMetronomeRunning()) {
      engine.stopMetronome()
      setMetronomeOn(false)
      setCurrentBeat(-1)
    } else {
      engine.startMetronome()
      setMetronomeOn(true)
    }
  }, [])

  const setTrackOffset = useCallback((trackId: number, offset: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, startOffset: offset } : t,
    ))
  }, [])

  const clearAll = useCallback(() => {
    setTracks(prev => prev.map(t => ({ ...t, audioBuffer: null })))
    setLoopDuration(0)
  }, [])

  return {
    tracks,
    devices,
    selectedDeviceId,
    isRecording,
    isPlaying,
    currentTime,
    loopDuration,
    inputGain,
    bpm,
    metronomeOn,
    currentBeat,
    isInitialized,
    initialize,
    selectDevice,
    armTrack,
    startRecording,
    stopRecording,
    play,
    stop,
    seekTo,
    setVolume,
    setPan,
    toggleMute,
    toggleSolo,
    clearTrack,
    clearAll,
    setInputGain,
    renameTrack,
    setBpm,
    toggleMetronome,
    setTrackOffset,
    engine: engineRef.current,
  }
}
