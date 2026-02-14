import { useState, useRef, useEffect } from 'react'
import { useAudioEngine } from './hooks/useAudioEngine'
import { AudioEngine } from './audio/AudioEngine'
import DeviceSelector from './components/DeviceSelector'
import { Track } from './types'

const TRACK_COLORS = [
  { bg: 'bg-amber-500/20', border: 'border-amber-500/40', fill: 'bg-amber-500', text: 'text-amber-400', wave: '#f59e0b' },
  { bg: 'bg-blue-500/20', border: 'border-blue-500/40', fill: 'bg-blue-500', text: 'text-blue-400', wave: '#3b82f6' },
  { bg: 'bg-green-500/20', border: 'border-green-500/40', fill: 'bg-green-500', text: 'text-green-400', wave: '#22c55e' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500/40', fill: 'bg-purple-500', text: 'text-purple-400', wave: '#a855f7' },
]

function buildWaveformPath(
  bins: { min: number; max: number }[],
  width: number,
  height: number,
): string {
  if (bins.length === 0) return ''
  const topPoints: string[] = []
  const bottomPoints: string[] = []
  const xScale = width / bins.length
  for (let i = 0; i < bins.length; i++) {
    const x = i * xScale
    topPoints.push(`${x},${((1 - bins[i].max) / 2) * height}`)
    bottomPoints.unshift(`${x},${((1 - bins[i].min) / 2) * height}`)
  }
  return `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`
}

function WaveformPreview({ track, color, engine }: { track: Track; color: string; engine: AudioEngine | null }) {
  // Live recording: read preview from engine
  if (track.isRecording && engine) {
    const preview = engine.getRecordingPreview()
    if (preview.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-red-400/60 text-xs animate-pulse">
          Recording...
        </div>
      )
    }
    const width = 800
    const height = 60
    const pathD = buildWaveformPath(preview, width, height)
    return (
      <div className="flex-1 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <path d={pathD} fill={color} opacity="0.7" />
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
    )
  }

  // Static: read from audioBuffer
  if (!track.audioBuffer) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
        {track.isArmed ? 'Armed — ready to record' : 'Empty'}
      </div>
    )
  }

  const data = track.audioBuffer.getChannelData(0)
  const width = 800
  const height = 60
  const step = Math.max(1, Math.floor(data.length / width))

  const bins: { min: number; max: number }[] = []
  for (let i = 0; i < width; i++) {
    const idx = i * step
    let min = 0, max = 0
    for (let j = 0; j < step && idx + j < data.length; j++) {
      const val = data[idx + j]
      if (val < min) min = val
      if (val > max) max = val
    }
    bins.push({ min, max })
  }

  const pathD = buildWaveformPath(bins, width, height)

  return (
    <div className="flex-1 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <path d={pathD} fill={color} opacity="0.6" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="0.5" opacity="0.3" />
      </svg>
    </div>
  )
}

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
    seekTo,
    setTrackOffset,
    engine,
  } = useAudioEngine()

  const [editingTrackId, setEditingTrackId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [menuTrackId, setMenuTrackId] = useState<number | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingTrackId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingTrackId])

  // Close menu when clicking outside
  useEffect(() => {
    if (menuTrackId === null) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuTrackId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuTrackId])

  const startEditing = (track: Track) => {
    setEditingTrackId(track.id)
    setEditName(track.name)
    setMenuTrackId(null)
  }

  const commitEdit = () => {
    if (editingTrackId !== null && editName.trim()) {
      renameTrack(editingTrackId, editName.trim())
    }
    setEditingTrackId(null)
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <button
          onClick={initialize}
          className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg font-medium transition-colors border border-gray-700"
        >
          Click to Start
        </button>
      </div>
    )
  }

  const armedTrack = tracks.find(t => t.isArmed)
  const hasRecordedTracks = tracks.some(t => t.audioBuffer)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Transport Bar */}
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3">
        {/* Record */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!armedTrack}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-400 animate-pulse'
              : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
          } ${!armedTrack ? 'opacity-30 cursor-not-allowed' : ''}`}
          title="Record"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
        </button>

        {/* Play/Stop */}
        <button
          onClick={isPlaying ? stop : play}
          disabled={!hasRecordedTracks}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
          } ${!hasRecordedTracks ? 'opacity-30 cursor-not-allowed' : ''}`}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? (
            <div className="w-2.5 h-2.5 bg-white rounded-sm" />
          ) : (
            <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-transparent border-l-white ml-0.5" />
          )}
        </button>

        {/* Time Display */}
        <div className="font-mono text-xs text-gray-400 min-w-[100px]">
          {formatTime(currentTime)}
          {loopDuration > 0 && (
            <span className="text-gray-600"> / {formatTime(loopDuration)}</span>
          )}
        </div>

        {/* Loop Progress (clickable to seek) */}
        {loopDuration > 0 && (
          <div
            className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden cursor-pointer relative group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              seekTo(fraction * loopDuration)
            }}
          >
            <div
              className="h-full bg-gray-500 rounded-full transition-all duration-100 group-hover:bg-gray-400"
              style={{ width: `${(currentTime / loopDuration) * 100}%` }}
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Metronome */}
        <div className="flex items-center gap-2 border-r border-gray-800 pr-3 mr-1">
          {/* Toggle */}
          <button
            onClick={toggleMetronome}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
              metronomeOn
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
            title={metronomeOn ? 'Stop metronome' : 'Start metronome'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L8 22h8L12 2z" />
              <path d="M12 8l4-3" />
            </svg>
          </button>

          {/* BPM control */}
          <button
            onClick={() => setBpm(bpm - 1)}
            className="w-4 h-4 rounded flex items-center justify-center text-gray-600 hover:text-gray-300 text-xs"
          >
            −
          </button>
          <span className="text-xs font-mono text-gray-400 w-8 text-center">{bpm}</span>
          <button
            onClick={() => setBpm(bpm + 1)}
            className="w-4 h-4 rounded flex items-center justify-center text-gray-600 hover:text-gray-300 text-xs"
          >
            +
          </button>

          {/* Beat indicator dots */}
          {metronomeOn && (
            <div className="flex items-center gap-1 ml-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    currentBeat === i
                      ? i === 0 ? 'bg-blue-400' : 'bg-gray-300'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input Gain */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Input</span>
          <input
            type="range"
            min="0"
            max="300"
            value={Math.round(inputGain * 100)}
            onChange={(e) => setInputGain(Number(e.target.value) / 100)}
            className="w-20 h-1 accent-gray-400"
          />
          <span className="text-[10px] text-gray-500 w-8 text-right font-mono">
            {inputGain <= 1 ? `${Math.round(inputGain * 100)}%` : `+${Math.round((inputGain - 1) * 100)}%`}
          </span>
        </div>

        {/* Device Selector */}
        <DeviceSelector
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelect={selectDevice}
        />
      </div>

      {/* Timeline Ruler */}
      {loopDuration > 0 && (
        <div className="flex border-b border-gray-800">
          {/* Spacer matching track header width */}
          <div className="w-44 flex-shrink-0 border-r border-gray-800 bg-gray-950" />
          {/* Ruler area */}
          <div
            className="flex-1 h-6 bg-gray-900/50 relative cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              seekTo(fraction * loopDuration)
            }}
          >
            {(() => {
              const secondsPerBeat = 60 / bpm
              const beatsPerBar = 4
              const totalBeats = Math.floor(loopDuration / secondsPerBeat)
              const markers: JSX.Element[] = []

              for (let beat = 0; beat <= totalBeats; beat++) {
                const time = beat * secondsPerBeat
                const pct = (time / loopDuration) * 100
                const isBarLine = beat % beatsPerBar === 0
                const barNumber = Math.floor(beat / beatsPerBar) + 1

                markers.push(
                  <div
                    key={beat}
                    className="absolute top-0 bottom-0 flex flex-col items-start"
                    style={{ left: `${pct}%` }}
                  >
                    {/* Tick mark */}
                    <div className={`w-px ${isBarLine ? 'h-full bg-gray-600' : 'h-2 bg-gray-700 mt-auto'}`} />
                    {/* Bar number label */}
                    {isBarLine && (
                      <span className="absolute top-0.5 left-1 text-[9px] text-gray-500 font-mono leading-none">
                        {barNumber}
                      </span>
                    )}
                  </div>,
                )
              }

              return markers
            })()}
            {/* Playhead on ruler */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/70 pointer-events-none"
              style={{ left: `${(currentTime / loopDuration) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Track Lanes */}
      <div className="flex-1 flex flex-col">
        {tracks.map((track) => {
          const colors = TRACK_COLORS[track.id] ?? TRACK_COLORS[0]

          return (
            <div
              key={track.id}
              className={`flex border-b border-gray-800/50 transition-colors ${
                track.isRecording ? 'bg-red-950/20' : ''
              }`}
              style={{ minHeight: '80px' }}
            >
              {/* Track Header */}
              <div className={`w-44 flex-shrink-0 border-r border-gray-800 px-3 py-2 flex flex-col justify-between ${
                track.isArmed ? 'bg-gray-900' : 'bg-gray-950'
              }`}>
                {/* Track name row */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.fill}`} />
                  {editingTrackId === track.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditingTrackId(null)
                      }}
                      className="text-sm font-medium bg-gray-800 text-white rounded px-1 py-0.5 w-full outline-none border border-gray-600"
                    />
                  ) : (
                    <button
                      onClick={() => armTrack(track.id)}
                      onDoubleClick={() => startEditing(track)}
                      className={`text-sm font-medium truncate ${track.isArmed ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
                      title="Click to arm, double-click to rename"
                    >
                      {track.name}
                    </button>
                  )}
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {/* Record arm */}
                  <button
                    onClick={() => armTrack(track.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      track.isArmed
                        ? 'bg-red-500/20 border border-red-500/50'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                    title="Arm for recording"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${track.isArmed ? 'bg-red-400' : 'bg-gray-600'}`} />
                  </button>

                  {/* Mute */}
                  <button
                    onClick={() => toggleMute(track.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-colors ${
                      track.muted
                        ? 'bg-red-900/60 text-red-400'
                        : 'bg-gray-800 text-gray-600 hover:text-gray-400'
                    }`}
                    title="Mute"
                  >
                    M
                  </button>

                  {/* Solo */}
                  <button
                    onClick={() => toggleSolo(track.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-colors ${
                      track.solo
                        ? 'bg-yellow-900/60 text-yellow-400'
                        : 'bg-gray-800 text-gray-600 hover:text-gray-400'
                    }`}
                    title="Solo"
                  >
                    S
                  </button>

                  <div className="flex-1" />

                  {/* Volume (compact) */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(track.volume * 100)}
                    onChange={(e) => setVolume(track.id, Number(e.target.value) / 100)}
                    className="w-14 h-0.5 accent-gray-500"
                    title={`Volume: ${Math.round(track.volume * 100)}%`}
                  />

                  {/* Three-dot menu */}
                  <div className="relative" ref={menuTrackId === track.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuTrackId(menuTrackId === track.id ? null : track.id)}
                      className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
                      title="More options"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <circle cx="6" cy="2" r="1.2" />
                        <circle cx="6" cy="6" r="1.2" />
                        <circle cx="6" cy="10" r="1.2" />
                      </svg>
                    </button>
                    {menuTrackId === track.id && (
                      <div className="absolute right-0 top-6 z-10 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 min-w-[120px]">
                        <button
                          onClick={() => startEditing(track)}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          Rename
                        </button>
                        {track.audioBuffer && (
                          <button
                            onClick={() => { clearTrack(track.id); setMenuTrackId(null) }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-gray-700 transition-colors"
                          >
                            Delete recording
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className={`text-[10px] mt-1 ${
                  track.isRecording ? 'text-red-400' : 'text-gray-600'
                }`}>
                  {track.isRecording
                    ? 'Recording...'
                    : track.audioBuffer
                    ? `${track.audioBuffer.duration.toFixed(1)}s`
                    : ''}
                </div>
              </div>

              {/* Waveform Region (click to seek, drag to reposition) */}
              <div
                className={`flex-1 ${track.audioBuffer || track.isRecording ? colors.bg : ''} relative overflow-hidden ${
                  track.audioBuffer && loopDuration > 0 ? 'cursor-pointer' : ''
                }`}
                onMouseDown={(e) => {
                  if (!track.audioBuffer || loopDuration <= 0) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const startX = e.clientX
                  const origOffset = track.startOffset
                  let dragged = false

                  const onMove = (moveE: MouseEvent) => {
                    const dx = moveE.clientX - startX
                    if (Math.abs(dx) > 3) dragged = true
                    if (dragged) {
                      const timeDelta = (dx / rect.width) * loopDuration
                      const newOffset = ((origOffset + timeDelta) % loopDuration + loopDuration) % loopDuration
                      setTrackOffset(track.id, newOffset)
                    }
                  }

                  const onUp = (upE: MouseEvent) => {
                    window.removeEventListener('mousemove', onMove)
                    window.removeEventListener('mouseup', onUp)
                    if (!dragged) {
                      // Click: seek to position
                      const fraction = Math.max(0, Math.min(1, (upE.clientX - rect.left) / rect.width))
                      seekTo(fraction * loopDuration)
                    }
                  }

                  window.addEventListener('mousemove', onMove)
                  window.addEventListener('mouseup', onUp)
                }}
              >
                {/* Waveform positioned by startOffset (with wrap) */}
                {track.audioBuffer && loopDuration > 0 ? (
                  <>
                    <div
                      className="absolute inset-y-0 flex items-center px-2"
                      style={{
                        left: `${(track.startOffset / loopDuration) * 100}%`,
                        width: '100%',
                      }}
                    >
                      <WaveformPreview track={track} color={colors.wave} engine={engine} />
                    </div>
                    {/* Wrapped portion at left edge */}
                    {track.startOffset > 0 && (
                      <div
                        className="absolute inset-y-0 flex items-center px-2"
                        style={{
                          left: `${((track.startOffset / loopDuration) - 1) * 100}%`,
                          width: '100%',
                        }}
                      >
                        <WaveformPreview track={track} color={colors.wave} engine={engine} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center px-2 h-full">
                    <WaveformPreview track={track} color={colors.wave} engine={engine} />
                  </div>
                )}
                {/* Playhead line — always visible when there's audio */}
                {track.audioBuffer && loopDuration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/70 pointer-events-none z-10"
                    style={{ left: `${(currentTime / loopDuration) * 100}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
