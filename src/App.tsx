import { useState, useCallback, useEffect } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useLooper } from './hooks/useLooper'
import { useRecorderShortcuts } from './hooks/useRecorderShortcuts'
import WoodPanel from './components/skeuomorphic/WoodPanel'
import MetalPanel from './components/skeuomorphic/MetalPanel'
import MixerSection from './components/skeuomorphic/MixerSection'
import CassetteDeck from './components/skeuomorphic/CassetteDeck'
import TransportButtons from './components/skeuomorphic/TransportButtons'
import LooperView from './components/skeuomorphic/LooperView'
import SessionDrawer from './components/skeuomorphic/SessionDrawer'
import ShortcutLegend from './components/skeuomorphic/ShortcutLegend'
import { loadSkin, saveSkin, SkinId, TRACK_COLORS } from './skins'

// Natural size of the desktop device (cream body + two wood cheeks), before fitting
const DEVICE_WIDTH = 1290 + 2 * 56
const DEVICE_HEIGHT = 880

/**
 * On desktop the recorder is one fixed-proportion object, zoomed to fit the window.
 * Below the desktop breakpoint the responsive stacked layout takes over (returns null).
 */
function useFitScale() {
  const [scale, setScale] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      // On phones a fixed-width device would itself widen the layout viewport and
      // lock the desktop layout in, so never trust a width beyond the screen's own
      const vw = Math.min(window.innerWidth, window.screen?.width || window.innerWidth)
      const vh = window.innerHeight
      if (vw <= 1120) {
        setScale(null)
        return
      }
      const padding = 2 * Math.min(16, vw * 0.012)
      const fit = Math.min((vw - padding) / DEVICE_WIDTH, (vh - padding) / DEVICE_HEIGHT)
      setScale(Math.max(0.75, Math.min(1.6, fit)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

function StatusDot() {
  return <span className="recorder-error-dot" aria-hidden="true" />
}

interface AppProps {
  /** Switches between recorders; shown in the bottom bar. */
  machinePicker?: React.ReactNode
}

/** The Porta Four: the original 4-track cassette recorder. */
export default function App({ machinePicker }: AppProps = {}) {
  const {
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
    recordingPreview,
    lastClearedTrack,
    initialize,
    selectDevice,
    armTrack,
    startRecording,
    stopRecording,
    play,
    stop,
    setVolume,
    setPan,
    toggleMute,
    toggleSolo,
    clearTrack,
    undoClearTrack,
    dismissClearUndo,
    setInputGain,
    renameTrack,
    setBpm,
    toggleMetronome,
    toggleMetronomeAudible,
    toggleCountIn,
    seekTo,
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
    exportFormats,
    exportAudio,
    isExporting,
    engine,
  } = useAudioEngine()

  const [mode, setMode] = useState<'multitrack' | 'looper'>('multitrack')
  const isLooperMode = mode === 'looper'

  const looper = useLooper(engine, isLooperMode)

  // Stomp button click = simulate a spacebar tap
  const handleStompClick = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }))
    }, 50)
  }, [])

  const switchMode = useCallback((nextMode: 'multitrack' | 'looper') => {
    if (nextMode === mode) return
    if (isRecording) stopRecording()
    if (isPlaying) stop()
    setMode(nextMode)
  }, [mode, isRecording, isPlaying, stopRecording, stop])

  const [skin, setSkinState] = useState<SkinId>(loadSkin)
  const setSkin = useCallback((next: SkinId) => {
    setSkinState(next)
    saveSkin(next)
  }, [])

  const tapeLanes = tracks.map((track, index) => ({
    id: track.id,
    name: track.name,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
    buffer: track.audioBuffer,
    muted: track.muted,
    armed: track.isArmed,
    recording: track.isRecording,
  }))

  const fitScale = useFitScale()
  const chassisStyle: React.CSSProperties | undefined = fitScale === null
    ? undefined
    : { zoom: fitScale, flex: 'none', width: DEVICE_WIDTH, height: DEVICE_HEIGHT, minHeight: 0 }

  const armedTrack = tracks.find(t => t.isArmed)
  const hasRecordedTracks = tracks.some(t => t.audioBuffer)

  useRecorderShortcuts({
    enabled: isInitialized && !isLooperMode,
    isPlaying,
    isRecording,
    isCountingIn,
    hasRecordedTracks,
    onPlay: play,
    onStop: stop,
    onStartRecording: startRecording,
    onStopRecording: stopRecording,
    onArmTrack: armTrack,
  })

  // Initialization screen
  if (!isInitialized) {
    return (
      <div className="recorder-shell flex items-center" data-skin={skin}>
        <div className="recorder-chassis flex flex-1 overflow-hidden" style={chassisStyle}>
          <WoodPanel side="left" />
          <div className="texture-body recorder-power flex-1 flex items-center justify-center relative">
            <div className="recorder-power-console">
              <div className="recorder-brand-plate">
                <span>PORTA FOUR</span>
                <small>Browser multitrack recorder</small>
              </div>

              <button
                onClick={initialize}
                disabled={isInitializing}
                className={`recorder-power-button w-20 h-20 rounded-full shadow-knob transition-all flex items-center justify-center ${isInitializing ? 'is-starting' : ''}`}
                style={{
                  background: 'radial-gradient(circle at 38% 35%, #c0b8a8, #807870 60%, #686058 100%)',
                }}
                title={initializationError ? 'Try audio input again' : 'Power on'}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v6" />
                  <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
                </svg>
              </button>
              <span className="recorder-power-label text-[11px] font-label uppercase tracking-[0.2em] text-engraved font-bold">
                {isInitializing ? 'Starting' : initializationError ? 'Try again' : 'Power'}
              </span>

              {initializationError && (
                <div className="recorder-power-error" role="alert">
                  <StatusDot />
                  <span>{initializationError}</span>
                </div>
              )}
            </div>
            {/* The machine switch and About are reachable before powering on */}
            <div className="recorder-power-bar session-bar">{machinePicker}</div>
          </div>
          <WoodPanel side="right" />
        </div>
      </div>
    )
  }

  return (
    <div className="recorder-shell flex items-center" data-skin={skin}>
      <div className="recorder-chassis flex flex-1 overflow-hidden" style={chassisStyle}>
        {/* Left wood panel */}
        <WoodPanel side="left" />

        {/* Main device body */}
        <div className="texture-body recorder-main is-powered flex flex-col flex-1 overflow-y-auto">
          {/* Top: Brushed metal panel with VU meters + knobs */}
          <MetalPanel
            engine={engine}
            isPlaying={isPlaying}
            isRecording={isRecording}
            inputGain={inputGain}
            setInputGain={setInputGain}
            bpm={bpm}
            setBpm={setBpm}
            metronomeOn={metronomeOn}
            metronomeAudible={metronomeAudible}
            countInEnabled={countInEnabled}
            toggleMetronome={toggleMetronome}
            toggleMetronomeAudible={toggleMetronomeAudible}
            toggleCountIn={toggleCountIn}
            currentBeat={currentBeat}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={selectDevice}
            inputError={initializationError}
            onRetryInput={initialize}
          />

          {/* Badge + mode switch */}
          <div className="recorder-mode-row">
            <div className="recorder-badge">
              <span>PORTA FOUR</span>
              <small>Browser multitrack recorder</small>
            </div>
            <div className="recorder-mode-switch">
              <button
                onClick={() => switchMode('multitrack')}
                aria-pressed={!isLooperMode}
                className="no-select"
              >
                4-Track
              </button>
              <button
                onClick={() => switchMode('looper')}
                aria-pressed={isLooperMode}
                className="no-select"
              >
                Looper
              </button>
            </div>
          </div>

          {/* Middle: Cassette+Transport (left) | Mixer (right) OR Looper */}
          <div className={`recorder-work-area flex flex-1 px-6 py-4 gap-10 ${isLooperMode ? 'recorder-work-area--looper items-center justify-center' : 'items-start justify-center'}`}>
            {isLooperMode ? (
              <>
                <CassetteDeck
                  isPlaying={looper.state === 'playing' || looper.state === 'overdubbing'}
                  isRecording={looper.state === 'recording' || looper.state === 'overdubbing'}
                  sessionName={currentSessionName}
                  onSetSessionName={setSessionName}
                  loopDuration={looper.loopDuration}
                  currentTime={looper.currentTime}
                />
                <LooperView
                  looper={looper}
                  onStompClick={handleStompClick}
                />
              </>
            ) : (
              <>
                {/* Left column: Cassette deck + Transport */}
                <div className="recorder-transport-column flex flex-col items-center gap-4">
                  <CassetteDeck
                    isPlaying={isPlaying}
                    isRecording={isRecording}
                    sessionName={currentSessionName}
                    onSetSessionName={setSessionName}
                    loopDuration={loopDuration}
                    currentTime={currentTime}
                    onSeekTo={seekTo}
                    lanes={tapeLanes}
                    recordingPreview={recordingPreview}
                  />
                  <TransportButtons
                    isRecording={isRecording}
                    isCountingIn={isCountingIn}
                    isPlaying={isPlaying}
                    hasArmedTrack={!!armedTrack}
                    hasRecordedTracks={hasRecordedTracks}
                    loopDuration={loopDuration}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onPlay={play}
                    onStop={stop}
                    onSeekTo={seekTo}
                  />
                </div>

                {/* Right column: Mixer */}
                <MixerSection
                  tracks={tracks}
                  onArmTrack={armTrack}
                  onSetVolume={setVolume}
                  onSetPan={setPan}
                  onToggleMute={toggleMute}
                  onToggleSolo={toggleSolo}
                  onClearTrack={clearTrack}
                  onRenameTrack={renameTrack}
                />
              </>
            )}
          </div>

          {lastClearedTrack && (
            <div className="recorder-undo-strip" role="status" aria-live="polite">
              <span className="recorder-undo-lamp" aria-hidden="true" />
              <span className="recorder-undo-message">
                {lastClearedTrack.trackName} erased
              </span>
              <button type="button" onClick={undoClearTrack} className="recorder-undo-button">
                Undo
              </button>
              <button
                type="button"
                onClick={dismissClearUndo}
                className="recorder-undo-dismiss"
                aria-label="Dismiss erase notice"
              >
                ×
              </button>
            </div>
          )}

          {/* Bottom: Session drawer */}
          <div style={{ borderTop: '1px solid var(--divider)' }}>
            <SessionDrawer
              sessions={sessions}
              currentSessionId={currentSessionId}
              onLoad={loadSessionById}
              onDelete={deleteSessionById}
              onNew={newSession}
              onSave={save}
              exportFormats={exportFormats}
              onExport={exportAudio}
              isSaving={isSaving}
              isExporting={isExporting}
              hasRecordedTracks={hasRecordedTracks}
              skin={skin}
              onSetSkin={setSkin}
              machinePicker={machinePicker}
            >
              {!isLooperMode && <ShortcutLegend />}
            </SessionDrawer>
          </div>
        </div>

        {/* Right wood panel */}
        <WoodPanel side="right" />
      </div>
    </div>
  )
}
