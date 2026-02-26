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
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={selectDevice}
          />

          {/* Mode toggle — recessed toggle strip */}
          <div className="flex items-center justify-center py-2" style={{
            borderBottom: '1px solid rgba(20,15,5,0.06)',
          }}>
            <div className="flex rounded-sm overflow-hidden" style={{
              boxShadow: 'inset 0 2px 4px rgba(20,15,5,0.25), inset 0 -1px 0 rgba(255,250,240,0.1), 0 1px 0 rgba(255,250,240,0.08)',
              background: 'linear-gradient(180deg, #c4bca8 0%, #bab2a0 100%)',
            }}>
              <button
                onClick={(e) => { toggleMode(); (e.target as HTMLElement).blur() }}
                tabIndex={-1}
                className="px-4 py-1.5 text-[9px] font-label uppercase tracking-wider font-bold transition-all no-select"
                style={{
                  background: !isLooperMode
                    ? 'linear-gradient(180deg, #506880 0%, #3a5a7a 40%, #2a4a6a 100%)'
                    : 'transparent',
                  color: !isLooperMode ? 'rgba(200,220,240,0.95)' : 'rgba(60,50,40,0.45)',
                  boxShadow: !isLooperMode
                    ? 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,250,240,0.06)'
                    : 'none',
                }}
              >
                4-Track
              </button>
              <button
                onClick={(e) => { toggleMode(); (e.target as HTMLElement).blur() }}
                tabIndex={-1}
                className="px-4 py-1.5 text-[9px] font-label uppercase tracking-wider font-bold transition-all no-select"
                style={{
                  background: isLooperMode
                    ? 'linear-gradient(180deg, #506880 0%, #3a5a7a 40%, #2a4a6a 100%)'
                    : 'transparent',
                  color: isLooperMode ? 'rgba(200,220,240,0.95)' : 'rgba(60,50,40,0.45)',
                  boxShadow: isLooperMode
                    ? 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,250,240,0.06)'
                    : 'none',
                }}
              >
                Looper
              </button>
            </div>
          </div>

          {/* Middle: Cassette+Transport (left) | Mixer (right) OR Looper */}
          <div className={`flex flex-1 px-6 py-4 gap-8 ${isLooperMode ? 'flex-col items-center justify-center' : 'items-start justify-center'}`}>
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
                <div className="flex flex-col items-center gap-4">
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

          {/* Bottom: Session drawer */}
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
          </div>
        </div>

        {/* Right wood panel */}
        <WoodPanel side="right" />
      </div>
    </div>
  )
}
