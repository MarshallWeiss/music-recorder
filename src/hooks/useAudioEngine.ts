import { useState, useRef, useEffect, useCallback } from 'react'
import { AudioEngine, AudioDevice } from '../audio/AudioEngine'
import { Track, Session, SerializedTrack, DEFAULT_TRACKS, NUM_TRACKS } from '../types'
import { saveSession, loadSession, getSessionList, deleteSession as deleteSessionFromStore } from '../storage/sessionStore'
import { encodeWav } from '../audio/wavEncoder'
import { ExportFormat, getSupportedFormats, encodeCompressed } from '../audio/mediaEncoder'

export interface SessionMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

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
  metronomeAudible: boolean
  countInEnabled: boolean
  isCountingIn: boolean
  currentBeat: number
  isInitialized: boolean
  isInitializing: boolean
  initializationError: string | null

  // Session state
  currentSessionId: string | null
  currentSessionName: string
  sessions: SessionMeta[]
  isSaving: boolean

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
  toggleMetronomeAudible: () => void
  toggleCountIn: () => void

  // Session actions
  save: () => Promise<void>
  loadSessionById: (id: string) => Promise<void>
  newSession: () => void
  deleteSessionById: (id: string) => Promise<void>
  setSessionName: (name: string) => void
  refreshSessions: () => Promise<void>

  // Export
  exportFormats: ExportFormat[]
  exportAudio: (format: ExportFormat) => Promise<void>
  isExporting: boolean

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
  const [inputGain, setInputGainState] = useState(3.0)
  const [bpm, setBpmState] = useState(120)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [metronomeAudible, setMetronomeAudible] = useState(true)
  const [countInEnabled, setCountInEnabled] = useState(true)
  const [isCountingIn, setIsCountingIn] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationError, setInitializationError] = useState<string | null>(null)

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSessionName, setCurrentSessionName] = useState('Untitled Session')
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Track state ref for use in callbacks without stale closures
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks
  const loopDurationRef = useRef(loopDuration)
  loopDurationRef.current = loopDuration

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
    setIsInitializing(true)
    setInitializationError(null)

    try {
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
        const context = await engine.init()
        const previewDuration = 8
        const previewBuffer = context.createBuffer(1, context.sampleRate * previewDuration, context.sampleRate)
        const channel = previewBuffer.getChannelData(0)
        for (let i = 0; i < channel.length; i += 1) {
          const pulse = 0.18 + 0.82 * Math.pow(Math.sin((i / context.sampleRate) * Math.PI * 2), 8)
          channel[i] = Math.sin((i / context.sampleRate) * Math.PI * 220) * pulse * 0.55
        }
        setDevices([{ deviceId: 'preview', label: 'Preview input' }])
        setSelectedDeviceId('preview')
        setTracks(prev => prev.map(track => track.id === 0 ? { ...track, audioBuffer: previewBuffer } : track))
        setLoopDuration(previewDuration)
        setIsInitialized(true)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser cannot access audio inputs. Use a current version of Chrome, Edge, Firefox, or Safari.')
      }

      await engine.init()
      const deviceList = await engine.enumerateDevices()
      setDevices(deviceList)

      if (deviceList.length === 0) {
        throw new Error('No microphone or audio interface was found. Connect one, then try again.')
      }

      // Auto-select TASCAM if found, otherwise first device
      const tascam = deviceList.find(d => d.label.toLowerCase().includes('us-1x2'))
      const defaultDevice = tascam || deviceList[0]
      await engine.selectDevice(defaultDevice.deviceId)
      engine.setInputGain(inputGain)
      setSelectedDeviceId(defaultDevice.deviceId)
      setIsInitialized(true)
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      const message = error instanceof Error ? error.message : ''

      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setInitializationError('Microphone access is blocked. Allow it in your browser settings, then try again.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setInitializationError('No microphone or audio interface was found. Connect one, then try again.')
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setInitializationError('Your audio input is busy in another app. Close it there, then try again.')
      } else {
        setInitializationError(message || 'The audio input could not be started. Check your connection and try again.')
      }
      setSelectedDeviceId(null)
      setIsInitialized(false)
    } finally {
      setIsInitializing(false)
    }
  }, [inputGain])

  const selectDevice = useCallback(async (deviceId: string) => {
    const engine = engineRef.current
    if (!engine) return
    setInitializationError(null)
    try {
      await engine.selectDevice(deviceId)
      engine.setInputGain(inputGain)
      setSelectedDeviceId(deviceId)
    } catch {
      setInitializationError('That audio input could not be opened. Check its connection or choose another input.')
    }
  }, [inputGain])

  useEffect(() => {
    if (!isInitialized || !navigator.mediaDevices?.addEventListener) return

    const handleDeviceChange = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices()
        const nextDevices = mediaDevices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 6)}`,
          }))

        setDevices(nextDevices)
        if (selectedDeviceId && !nextDevices.some(device => device.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(null)
          setInitializationError('The selected audio input was disconnected. Reconnect it or choose another input.')
        }
      } catch {
        setInitializationError('Audio inputs could not be refreshed. Check browser access and try again.')
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [isInitialized, selectedDeviceId])

  const armTrack = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      isArmed: t.id === trackId,
    })))
  }, [])

  // Ref so startRecording callback can read current countInEnabled without going stale
  const countInEnabledRef = useRef(countInEnabled)
  countInEnabledRef.current = countInEnabled

  const beginRecordingNow = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const armed = tracksRef.current.find(t => t.isArmed)
    if (!armed) return

    const hasLoop = loopDurationRef.current > 0

    // Stop any existing playback to avoid double sources
    if (engine.isPlaying()) {
      engine.stopAllPlayback()
    }

    // Build monitor buffers (all tracks except the armed one)
    const monitorBuffers = tracksRef.current
      .filter(t => t.id !== armed.id && t.audioBuffer)
      .map(t => ({
        buffer: t.audioBuffer!,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
      }))

    setTracks(prev => prev.map(t =>
      t.id === armed.id ? { ...t, isRecording: true } : t,
    ))
    setIsRecording(true)
    setIsPlaying(false)
    setIsCountingIn(false)

    try {
      engine.startRecording(
        monitorBuffers,
        hasLoop ? loopDurationRef.current : undefined,
        0, // Always start from position 0
      )
    } catch {
      setTracks(prev => prev.map(t => ({ ...t, isRecording: false })))
      setIsRecording(false)
      setInitializationError('The selected audio input is unavailable. Reconnect it or choose another input.')
      return
    }

    // Poll for auto-stop (engine sets isCurrentlyRecording = false at loop boundary)
    const interval = setInterval(() => {
      if (!engine.isRecording()) {
        clearInterval(interval)
        const buffer = engine.stopRecording()
        handleRecordingComplete(armed.id, buffer)
      }
    }, 100)

    ;(engine as any)._autoStopInterval = interval
  }, [])

  const startRecording = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const armed = tracksRef.current.find(t => t.isArmed)
    if (!armed) return

    if (countInEnabledRef.current) {
      setIsCountingIn(true)
      engine.startCountIn(() => {
        beginRecordingNow()
      })
    } else {
      beginRecordingNow()
    }
  }, [beginRecordingNow])

  const handleRecordingComplete = useCallback((trackId: number, buffer: AudioBuffer | null) => {
    setTracks(prev => {
      const updated = prev.map(t =>
        t.id === trackId
          ? { ...t, isRecording: false, audioBuffer: buffer ?? t.audioBuffer }
          : t,
      )

      // First recording on any track sets the loop/tape length
      if (buffer && loopDurationRef.current <= 0) {
        setLoopDuration(buffer.duration)
      }

      return updated
    })
    setIsRecording(false)
  }, [])

  const stopRecording = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    // Cancel count-in if in progress
    engine.stopCountIn()
    setIsCountingIn(false)

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
      // If no tracks have audio left, reset the tape
      const hasAnyAudio = updated.some(t => t.audioBuffer)
      if (!hasAnyAudio) {
        setLoopDuration(0)
        setCurrentTime(0)
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

  const toggleMetronomeAudible = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    const next = !metronomeAudible
    setMetronomeAudible(next)
    engine.setMetronomeAudible(next)
  }, [metronomeAudible])

  const toggleCountIn = useCallback(() => {
    setCountInEnabled(prev => !prev)
  }, [])

  const clearAll = useCallback(() => {
    setTracks(prev => prev.map(t => ({ ...t, audioBuffer: null })))
    setLoopDuration(0)
  }, [])

  // --- Session management ---

  const bpmRef = useRef(bpm)
  bpmRef.current = bpm
  const sessionIdRef = useRef(currentSessionId)
  sessionIdRef.current = currentSessionId
  const sessionNameRef = useRef(currentSessionName)
  sessionNameRef.current = currentSessionName

  const refreshSessions = useCallback(async () => {
    const list = await getSessionList()
    setSessions(list)
  }, [])

  // Load session list on mount
  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const save = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    setIsSaving(true)

    const now = Date.now()
    const id = sessionIdRef.current ?? crypto.randomUUID()
    const isNew = !sessionIdRef.current

    const serializedTracks: SerializedTrack[] = tracksRef.current.map(t => ({
      id: t.id,
      name: t.name,
      audioData: t.audioBuffer ? engine.serializeBuffer(t.audioBuffer) : null,
      volume: t.volume,
      pan: t.pan,
      muted: t.muted,
      solo: t.solo,
    }))

    const session: Session = {
      id,
      name: sessionNameRef.current,
      createdAt: isNew ? now : now, // will be overwritten by existing if updating
      updatedAt: now,
      loopDuration: loopDurationRef.current,
      sampleRate: engine.getSampleRate(),
      bpm: bpmRef.current,
      tracks: serializedTracks,
    }

    // Preserve original creation time if updating
    if (!isNew) {
      const existing = sessions.find(s => s.id === id)
      if (existing) session.createdAt = existing.createdAt
    }

    await saveSession(session)
    setCurrentSessionId(id)
    await refreshSessions()
    setIsSaving(false)
  }, [sessions, refreshSessions])

  const loadSessionById = useCallback(async (id: string) => {
    const engine = engineRef.current
    if (!engine) return

    const session = await loadSession(id)
    if (!session) return

    // Stop any active playback/recording
    if (engine.isPlaying()) engine.stopAllPlayback()
    setIsPlaying(false)
    setIsRecording(false)

    // Restore BPM
    setBpmState(session.bpm ?? 120)
    engine.setBpm(session.bpm ?? 120)

    // Restore tracks with deserialized AudioBuffers
    const restoredTracks: Track[] = DEFAULT_TRACKS.map((def, i) => {
      const saved = session.tracks.find(t => t.id === i)
      if (!saved) return { ...def }
      return {
        id: saved.id,
        name: saved.name,
        audioBuffer: saved.audioData
          ? engine.createBufferFromData(saved.audioData, session.sampleRate)
          : null,
        volume: saved.volume,
        pan: saved.pan,
        muted: saved.muted,
        solo: saved.solo,
        isRecording: false,
        isArmed: i === 0,
      }
    })

    setTracks(restoredTracks)
    setLoopDuration(session.loopDuration)
    setCurrentTime(0)
    setCurrentSessionId(session.id)
    setCurrentSessionName(session.name)
  }, [])

  const newSession = useCallback(() => {
    const engine = engineRef.current
    if (engine && engine.isPlaying()) {
      engine.stopAllPlayback()
    }
    setIsPlaying(false)
    setIsRecording(false)
    setTracks(DEFAULT_TRACKS.map(t => ({ ...t })))
    setLoopDuration(0)
    setCurrentTime(0)
    setCurrentSessionId(null)
    setCurrentSessionName('Untitled Session')
  }, [])

  const deleteSessionById = useCallback(async (id: string) => {
    await deleteSessionFromStore(id)
    await refreshSessions()
    // If we deleted the current session, reset the ID
    if (sessionIdRef.current === id) {
      setCurrentSessionId(null)
    }
  }, [refreshSessions])

  const setSessionName = useCallback((name: string) => {
    setCurrentSessionName(name)
  }, [])

  // --- Audio Export ---

  const wavFormat: ExportFormat = { label: 'WAV', mimeType: 'audio/wav', ext: 'wav' }
  const exportFormats: ExportFormat[] = [wavFormat, ...getSupportedFormats()]

  const exportAudio = useCallback(async (format: ExportFormat) => {
    const engine = engineRef.current
    if (!engine) return
    const currentTracks = tracksRef.current
    const duration = loopDurationRef.current

    const trackData = currentTracks
      .filter(t => t.audioBuffer)
      .map(t => ({
        buffer: t.audioBuffer!,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
      }))

    if (trackData.length === 0 || duration <= 0) return

    setIsExporting(true)
    try {
      const mixedBuffer = await engine.exportMix(trackData, duration)

      let blob: Blob
      if (format.ext === 'wav') {
        blob = encodeWav(mixedBuffer)
      } else {
        blob = await encodeCompressed(mixedBuffer, format.mimeType)
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sessionNameRef.current || 'mix'}.${format.ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }, [])

  // Auto-save after recording completes (debounced to avoid rapid saves)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) return

    // Only auto-save if there's recorded audio and we have a session
    const hasAudio = tracks.some(t => t.audioBuffer)
    if (!hasAudio || isRecording) return

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    autoSaveTimeoutRef.current = setTimeout(() => {
      save()
    }, 2000)

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [tracks, isRecording, save])

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
    metronomeAudible,
    countInEnabled,
    isCountingIn,
    currentBeat,
    isInitialized,
    isInitializing,
    initializationError,
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
    toggleMetronomeAudible,
    toggleCountIn,
    // Session
    currentSessionId,
    currentSessionName,
    sessions,
    isSaving,
    save,
    loadSessionById,
    newSession,
    deleteSessionById,
    setSessionName,
    refreshSessions,
    exportFormats,
    exportAudio,
    isExporting,
    engine: engineRef.current,
  }
}
