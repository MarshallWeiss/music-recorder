import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import { Gesture, useGesture } from './useGesture'

export type LooperState = 'empty' | 'recording' | 'playing' | 'overdubbing' | 'stopped'

export interface UseLooperReturn {
  state: LooperState
  layerCount: number
  loopDuration: number
  currentTime: number
  canUndo: boolean
  undoIsRedo: boolean  // true if next undo action would actually redo
  ledColor: 'off' | 'red' | 'green' | 'green-flash' | 'red-pulse'
}

export function useLooper(engine: AudioEngine | null, enabled: boolean): UseLooperReturn {
  const [state, setState] = useState<LooperState>('empty')
  const [layerCount, setLayerCount] = useState(0)
  const [loopDuration, setLoopDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [undoIsRedo, setUndoIsRedo] = useState(false)

  // Audio buffers — refs to avoid stale closures
  const compositeRef = useRef<AudioBuffer | null>(null)
  const undoBufferRef = useRef<AudioBuffer | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const loopDurationRef = useRef(0)

  // Time tracking
  useEffect(() => {
    if (!engine || !enabled) return
    engine.onTimeUpdate = (time) => setCurrentTime(time)
    return () => { engine.onTimeUpdate = null }
  }, [engine, enabled])

  // Auto-stop polling ref
  const autoStopRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current) {
      clearInterval(autoStopRef.current)
      autoStopRef.current = null
    }
  }, [])

  const startPlayback = useCallback(() => {
    if (!engine || !compositeRef.current) return
    engine.stopAllPlayback()
    engine.playAll(
      [{ buffer: compositeRef.current, volume: 1, pan: 0, muted: false, solo: false }],
      true,
      0,
    )
  }, [engine])

  const handleRecordingFirstComplete = useCallback(() => {
    if (!engine) return
    clearAutoStop()
    const buffer = engine.stopRecording()
    if (!buffer || buffer.length === 0) {
      setState('empty')
      return
    }
    compositeRef.current = buffer
    loopDurationRef.current = buffer.duration
    setLoopDuration(buffer.duration)
    setLayerCount(1)
    setState('playing')
    // Start looping immediately
    engine.playAll(
      [{ buffer, volume: 1, pan: 0, muted: false, solo: false }],
      true,
      0,
    )
  }, [engine, clearAutoStop])

  const handleOverdubComplete = useCallback(() => {
    if (!engine) return
    clearAutoStop()
    const overdubBuffer = engine.stopRecording()
    if (!overdubBuffer || !compositeRef.current) {
      setState('playing')
      startPlayback()
      return
    }
    // Save current composite for undo
    undoBufferRef.current = compositeRef.current
    setCanUndo(true)
    setUndoIsRedo(false)
    // Bounce down: mix overdub into composite
    compositeRef.current = engine.mixBuffers(compositeRef.current, overdubBuffer)
    setLayerCount(prev => prev + 1)
    setState('playing')
    startPlayback()
  }, [engine, clearAutoStop, startPlayback])

  const startOverdub = useCallback(() => {
    if (!engine || !compositeRef.current) return
    // Capture current position before stopping so overdub continues seamlessly
    const pos = engine.getCurrentTime()
    engine.stopAllPlayback()
    engine.startRecording(
      [{ buffer: compositeRef.current, volume: 1, pan: 0, muted: false }],
      loopDurationRef.current,
      pos,
    )
    setState('overdubbing')
    // Poll for auto-stop at loop boundary
    autoStopRef.current = setInterval(() => {
      if (!engine.isRecording()) {
        handleOverdubComplete()
      }
    }, 50)
  }, [engine, handleOverdubComplete])

  const handleGesture = useCallback((gesture: Gesture) => {
    if (!engine) return
    const s = stateRef.current

    switch (gesture) {
      case 'tap':
        if (s === 'empty') {
          // Start first recording
          engine.startRecording([], undefined, 0)
          setState('recording')
        } else if (s === 'recording') {
          // End first recording → play
          handleRecordingFirstComplete()
        } else if (s === 'playing') {
          // Start overdub
          startOverdub()
        } else if (s === 'overdubbing') {
          // End overdub → play
          handleOverdubComplete()
        } else if (s === 'stopped') {
          // Resume playback
          startPlayback()
          setState('playing')
        }
        break

      case 'hold':
        if (s === 'playing') {
          // Undo/redo last overdub
          if (canUndo && undoBufferRef.current) {
            // Swap composite and undo buffer
            const temp = compositeRef.current
            compositeRef.current = undoBufferRef.current
            undoBufferRef.current = temp
            setUndoIsRedo(prev => !prev)
            // Restart playback with swapped buffer
            startPlayback()
          }
        }
        break

      case 'double-tap':
        if (s === 'playing' || s === 'overdubbing') {
          // Stop (loop stays in memory)
          clearAutoStop()
          if (engine.isRecording()) engine.stopRecording()
          engine.stopAllPlayback()
          setState('stopped')
        }
        break

      case 'double-tap-hold':
        // Delete loop entirely
        clearAutoStop()
        if (engine.isRecording()) engine.stopRecording()
        engine.stopAllPlayback()
        compositeRef.current = null
        undoBufferRef.current = null
        setLayerCount(0)
        setLoopDuration(0)
        setCurrentTime(0)
        setCanUndo(false)
        setUndoIsRedo(false)
        setState('empty')
        break
    }
  }, [engine, canUndo, handleRecordingFirstComplete, handleOverdubComplete, startOverdub, startPlayback, clearAutoStop])

  useGesture({
    onGesture: handleGesture,
    enabled: enabled && !!engine,
  })

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      clearAutoStop()
      if (engine?.isRecording()) engine.stopRecording()
      if (engine?.isPlaying()) engine.stopAllPlayback()
      compositeRef.current = null
      undoBufferRef.current = null
      setState('empty')
      setLayerCount(0)
      setLoopDuration(0)
      setCurrentTime(0)
      setCanUndo(false)
      setUndoIsRedo(false)
    }
  }, [enabled, engine, clearAutoStop])

  // LED color derived from state
  let ledColor: UseLooperReturn['ledColor'] = 'off'
  if (state === 'recording' || state === 'overdubbing') ledColor = 'red'
  else if (state === 'playing') ledColor = 'green'
  else if (state === 'stopped') ledColor = 'green-flash'

  return { state, layerCount, loopDuration, currentTime, canUndo, undoIsRedo, ledColor }
}
