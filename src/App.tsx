import { useState, useCallback } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useLooper } from './hooks/useLooper'
import WoodPanel from './components/skeuomorphic/WoodPanel'
import MetalPanel from './components/skeuomorphic/MetalPanel'
import MixerSection from './components/skeuomorphic/MixerSection'
import CassetteDeck from './components/skeuomorphic/CassetteDeck'
import TransportButtons from './components/skeuomorphic/TransportButtons'
import LooperView from './components/skeuomorphic/LooperView'
import SessionDrawer from './components/skeuomorphic/SessionDrawer'
import DeviceSelector from './components/DeviceSelector'

export default function App() {
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

  const toggleMode = useCallback(() => {
    if (isRecording) stopRecording()
    if (isPlaying) stop()
    setMode(prev => prev === 'multitrack' ? 'looper' : 'multitrack')
  }, [isRecording, isPlaying, stopRecording, stop])

  const armedTrack = tracks.find(t => t.isArmed)
  const hasRecordedTracks = tracks.some(t => t.audioBuffer)

  // Initialization screen
  if (!isInitialized) {
    return (
      <div className="h-screen flex" style={{ background: '#1a1612' }}>
        <div className="flex flex-1 overflow-hidden">
          <WoodPanel side="left" />
          <div className="texture-body flex-1 flex items-center justify-center relative">
            <button
              onClick={initialize}
              className="w-16 h-16 rounded-full shadow-knob cursor-pointer transition-all hover:brightness-110 active:shadow-button-down active:translate-y-px flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 38% 35%, #c0b8a8, #807870 60%, #686058 100%)',
              }}
              title="Power on"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v6" />
                <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
              </svg>
            </button>
            <span className="absolute mt-28 text-[10px] font-label uppercase tracking-[0.2em] text-engraved font-bold">
              Power
            </span>
          </div>
          <WoodPanel side="right" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex" style={{ background: '#1a1612' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left wood panel */}
        <WoodPanel side="left" />

        {/* Main device body */}
        <div className="texture-body flex flex-col flex-1 overflow-y-auto">
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
          />

          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-3 py-1.5 border-b border-hw-400/10">
            <button
              onClick={toggleMode}
              className={`px-3 py-1 rounded text-[9px] font-label uppercase tracking-wider font-bold transition-all ${
                !isLooperMode ? 'shadow-button-down' : 'shadow-button-up'
              }`}
              style={{
                background: !isLooperMode
                  ? 'radial-gradient(circle, #4a6a8a 0%, #3a5a7a 100%)'
                  : 'radial-gradient(circle at 38% 35%, #a09888, #706860 100%)',
                color: !isLooperMode ? 'rgba(200,210,230,0.9)' : 'rgba(0,0,0,0.35)',
              }}
            >
              4-Track
            </button>
            <button
              onClick={toggleMode}
              className={`px-3 py-1 rounded text-[9px] font-label uppercase tracking-wider font-bold transition-all ${
                isLooperMode ? 'shadow-button-down' : 'shadow-button-up'
              }`}
              style={{
                background: isLooperMode
                  ? 'radial-gradient(circle, #4a6a8a 0%, #3a5a7a 100%)'
                  : 'radial-gradient(circle at 38% 35%, #a09888, #706860 100%)',
                color: isLooperMode ? 'rgba(200,210,230,0.9)' : 'rgba(0,0,0,0.35)',
              }}
            >
              Looper
            </button>
          </div>

          {/* Middle: Mixer + Transport (multitrack) or Stomp (looper) */}
          <div className="flex items-stretch flex-1 px-4 py-4 gap-4">
            {isLooperMode ? (
              <LooperView
                looper={looper}
                sessionName={currentSessionName}
                onSetSessionName={setSessionName}
                onStompClick={handleStompClick}
              />
            ) : (
              <>
                {/* Mixer section (left) */}
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

                {/* Cassette deck + transport (right) */}
                <div className="flex flex-col items-center gap-2 flex-1 justify-center">
                  <CassetteDeck
                    isPlaying={isPlaying}
                    isRecording={isRecording}
                    sessionName={currentSessionName}
                    onSetSessionName={setSessionName}
                    loopDuration={loopDuration}
                    currentTime={currentTime}
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
              </>
            )}
          </div>

          {/* Bottom: Session drawer + device selector */}
          <div className="border-t border-hw-400/20">
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
            />

            {/* Device selector */}
            <div className="flex items-center gap-2 px-3 pb-2">
              <span className="text-[8px] font-label uppercase tracking-wider text-engraved font-bold">
                Input
              </span>
              <DeviceSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelect={selectDevice}
              />
            </div>
          </div>
        </div>

        {/* Right wood panel */}
        <WoodPanel side="right" />
      </div>
    </div>
  )
}
