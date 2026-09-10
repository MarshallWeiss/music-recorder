import { useState, useCallback, useRef, useEffect } from 'react'
import { AudioEngine, AudioDevice } from '../../audio/AudioEngine'
import { useTuner } from '../../hooks/useTuner'
import { Tuning, TUNINGS } from '../../audio/tunings'
import { loadCustomTunings, saveCustomTunings, loadSelectedTuningName, saveSelectedTuningName } from '../../storage/tuningStore'
import VUMeter from './VUMeter'
import TunerDisplay from './TunerDisplay'
import TuningDropdown from './TuningDropdown'
import RotaryKnob from './RotaryKnob'
import BeatIndicator from './BeatIndicator'
import StatusLED from './StatusLED'

interface MetalPanelProps {
  engine: AudioEngine | null
  isPlaying: boolean
  isRecording: boolean
  inputGain: number
  setInputGain: (gain: number) => void
  bpm: number
  setBpm: (bpm: number) => void
  metronomeOn: boolean
  metronomeAudible: boolean
  countInEnabled: boolean
  toggleMetronome: () => void
  toggleMetronomeAudible: () => void
  toggleCountIn: () => void
  currentBeat: number
  devices: AudioDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  inputError: string | null
  onRetryInput: () => void
}

export default function MetalPanel({
  engine,
  isPlaying,
  isRecording,
  inputGain,
  setInputGain,
  bpm,
  setBpm,
  metronomeOn,
  metronomeAudible,
  countInEnabled,
  toggleMetronome,
  toggleMetronomeAudible,
  toggleCountIn,
  currentBeat,
  devices,
  selectedDeviceId,
  onSelectDevice,
  inputError,
  onRetryInput,
}: MetalPanelProps) {
  const [tunerVisible, setTunerVisible] = useState(false)
  const tuner = useTuner(engine, tunerVisible)

  // Tuning state — name-based for persistence
  const [allTunings, setAllTunings] = useState<Tuning[]>(TUNINGS)
  const [currentTuningName, setCurrentTuningName] = useState('Standard')
  const [tuningDropdownOpen, setTuningDropdownOpen] = useState(false)
  const tuningDropdownRef = useRef<HTMLDivElement>(null)

  const currentTuning = allTunings.find(t => t.name === currentTuningName) || allTunings[1]

  // Load custom tunings + saved selection on mount
  useEffect(() => {
    async function load() {
      const custom = await loadCustomTunings()
      if (custom.length > 0) {
        setAllTunings([...TUNINGS, ...custom])
      }
      const savedName = await loadSelectedTuningName()
      setCurrentTuningName(savedName)
    }
    load()
  }, [])

  // Close tuning dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tuningDropdownRef.current && !tuningDropdownRef.current.contains(e.target as Node)) {
        setTuningDropdownOpen(false)
      }
    }
    if (tuningDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tuningDropdownOpen])

  const handleSelectTuning = useCallback((tuning: Tuning) => {
    setCurrentTuningName(tuning.name)
    saveSelectedTuningName(tuning.name)
    setTuningDropdownOpen(false)
  }, [])

  const handleSaveCustomTuning = useCallback(async (tuning: Tuning) => {
    const custom = await loadCustomTunings()
    const updated = [...custom, tuning]
    await saveCustomTunings(updated)
    setAllTunings([...TUNINGS, ...updated])
    setCurrentTuningName(tuning.name)
    saveSelectedTuningName(tuning.name)
  }, [])

  const handleDeleteCustomTuning = useCallback(async (tuning: Tuning) => {
    const custom = await loadCustomTunings()
    const updated = custom.filter(t => t.name !== tuning.name)
    await saveCustomTunings(updated)
    setAllTunings([...TUNINGS, ...updated])
    if (currentTuningName === tuning.name) {
      setCurrentTuningName('Standard')
      saveSelectedTuningName('Standard')
    }
  }, [currentTuningName])

  // Device dropdown state
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close device dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDeviceDropdownOpen(false)
      }
    }
    if (deviceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [deviceDropdownOpen])

  // Get selected device label
  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId)
  const deviceLabel = selectedDevice?.label || 'No device'

  // Get analyser for VU meters
  // During playback: show mix of playing tracks
  // Otherwise: always show live input level (like a traditional input meter)
  const getLeftAnalyser = () => {
    if (!engine) return null
    if (isPlaying && !isRecording) return engine.getAnalyser(0) ?? engine.getAnalyser(1)
    return engine.getInputAnalyser()
  }

  const getRightAnalyser = () => {
    if (!engine) return null
    if (isPlaying && !isRecording) return engine.getAnalyser(2) ?? engine.getAnalyser(1) ?? engine.getAnalyser(0)
    return engine.getInputAnalyser()
  }

  // BPM knob: map 60-200 to 0-1
  const bpmToKnob = (b: number) => (b - 60) / 140
  const knobToBpm = (v: number) => Math.round(60 + v * 140)

  // Input gain knob: map 0-10 to 0-1
  // Range gives ~+20dB max boost for quiet internal mics
  const gainToKnob = (g: number) => g / 10
  const knobToGain = (v: number) => v * 10

  return (
    <div className="texture-metal recorder-metal-panel px-6 py-5" style={{
      borderBottom: '1px solid rgba(20,15,5,0.15)',
      boxShadow: '0 2px 8px rgba(20,15,5,0.15), inset 0 1px 0 rgba(255,250,240,0.12)',
    }}>
      {/* Input gain with device selector (left) - fixed width to match right controls */}
      <div className="recorder-input-cluster flex flex-col items-center gap-0.5 relative w-[200px] shrink-0" ref={dropdownRef}>
        <RotaryKnob
          value={gainToKnob(inputGain)}
          onChange={(v) => setInputGain(knobToGain(v))}
          size="lg"
          ticks={9}
        />
        <button
          onClick={() => devices.length > 1 && setDeviceDropdownOpen(!deviceDropdownOpen)}
          className={`text-[9px] font-label uppercase tracking-wider text-engraved font-bold text-center max-w-full ${devices.length > 1 ? 'cursor-pointer hover:text-hw-700' : ''}`}
          title={devices.length > 1 ? 'Select input device' : deviceLabel}
        >
          {deviceLabel}
        </button>

        {inputError && (
          <button
            type="button"
            onClick={onRetryInput}
            className="recorder-input-error"
            title={inputError}
          >
            Input offline · retry
          </button>
        )}

        {/* Device dropdown */}
        {deviceDropdownOpen && devices.length > 1 && (
          <div
            className="absolute top-full mt-1 z-50 rounded shadow-lg py-1 min-w-[160px]"
            style={{
              background: 'linear-gradient(180deg, #e8e0d0 0%, #d8d0c0 100%)',
              border: '1px solid #a09888',
            }}
          >
            {devices.map((d) => (
              <button
                key={d.deviceId}
                onClick={() => {
                  onSelectDevice(d.deviceId)
                  setDeviceDropdownOpen(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-[10px] font-label hover:bg-hw-300/50 ${
                  d.deviceId === selectedDeviceId ? 'bg-hw-400/30 font-bold' : ''
                }`}
                style={{ color: '#4a3a28' }}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VU Meters (center) */}
      <div className="recorder-meter-bank flex items-center gap-3 justify-center">
        <div className="recorder-vu-meter"><VUMeter analyser={getLeftAnalyser()} label="L" width={190} height={120} /></div>
        <div className="recorder-vu-meter"><VUMeter analyser={getRightAnalyser()} label="R" width={190} height={120} /></div>
      </div>

      {/* Right side controls */}
      <div className={`recorder-control-cluster flex items-center gap-4 shrink-0 justify-end ${(tunerVisible || metronomeOn) ? 'is-expanded' : ''}`}>
        {/* Tuner expanded panel */}
        {tunerVisible && (
          <div className="relative" ref={tuningDropdownRef}>
            <TunerDisplay
              tuner={tuner}
              tuning={currentTuning}
              onTuningClick={() => setTuningDropdownOpen(!tuningDropdownOpen)}
              width={120}
              height={110}
            />
            {tuningDropdownOpen && (
              <TuningDropdown
                allTunings={allTunings}
                currentTuning={currentTuning}
                onSelect={handleSelectTuning}
                onSaveCustom={handleSaveCustomTuning}
                onDeleteCustom={handleDeleteCustomTuning}
              />
            )}
          </div>
        )}

        {/* Metronome expanded panel */}
        {metronomeOn && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-0.5">
              <RotaryKnob
                value={bpmToKnob(bpm)}
                onChange={(v) => setBpm(knobToBpm(v))}
                size="lg"
                ticks={9}
              />
              <span className="text-[9px] font-mono text-hw-600 font-bold">{bpm}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <BeatIndicator currentBeat={currentBeat} metronomeOn={metronomeOn} />
              <div className="flex items-center gap-1.5">
                {/* Audible/Visual toggle */}
                <button
                  onClick={toggleMetronomeAudible}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    !metronomeAudible ? 'shadow-button-down' : 'shadow-button-up'
                  }`}
                  style={{
                    background: !metronomeAudible
                      ? 'radial-gradient(circle at 45% 40%, #8a7a4a, #6a5a3a 50%, #5a4a2a 100%)'
                      : 'radial-gradient(circle at 42% 38%, #a09888, #808078 50%, #686058 100%)',
                  }}
                  title={metronomeAudible ? 'Switch to visual-only (silent)' : 'Switch to audible clicks'}
                >
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={metronomeAudible ? 'rgba(0,0,0,0.4)' : 'rgba(200,180,100,0.8)'} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 4.5h1.5L6 2.5v7l-2.5-2H2v-3z" fill={metronomeAudible ? 'rgba(0,0,0,0.2)' : 'rgba(200,180,100,0.4)'} />
                    {!metronomeAudible && <path d="M8 4l3 3M11 4l-3 3" />}
                    {metronomeAudible && <path d="M8.5 3.5a3.5 3.5 0 0 1 0 5" />}
                  </svg>
                </button>
                {/* Count-in toggle */}
                <button
                  onClick={toggleCountIn}
                  className={`flex items-center gap-0.5 px-1 py-0.5 rounded transition-all ${
                    countInEnabled ? 'shadow-button-down' : 'shadow-button-up'
                  }`}
                  style={{
                    background: countInEnabled
                      ? 'radial-gradient(circle, #4a6a8a 0%, #3a5a7a 100%)'
                      : 'radial-gradient(circle at 38% 35%, #a09888, #706860 100%)',
                  }}
                  title={countInEnabled ? 'Count-in enabled (1 bar before overdub)' : 'Count-in disabled'}
                >
                  <StatusLED active={countInEnabled} color="amber" size="sm" />
                  <span className="text-[6px] font-label uppercase tracking-wider font-bold" style={{ color: countInEnabled ? 'rgba(200,180,100,0.9)' : 'rgba(0,0,0,0.3)' }}>
                    C-In
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toggle button row — always visible */}
        <div className="flex items-center gap-3">
          {/* Tuner toggle */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => { setTunerVisible(v => !v); setTuningDropdownOpen(false) }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                tunerVisible ? 'shadow-button-down' : 'shadow-button-up'
              }`}
              style={{
                background: tunerVisible
                  ? 'radial-gradient(circle at 45% 40%, #4a6a9a, #3a5a8a 50%, #2a4a7a 100%)'
                  : 'radial-gradient(circle at 42% 38%, #b0a898, #908880 50%, #706860 100%)',
              }}
              title={tunerVisible ? 'Hide tuner' : 'Show tuner'}
            >
              <StatusLED active={tunerVisible} color="blue" size="sm" />
            </button>
            <span className="text-[7px] font-label uppercase tracking-wider text-engraved font-bold">
              Tuner
            </span>
          </div>

          {/* Metronome toggle */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleMetronome}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                metronomeOn ? 'shadow-button-down' : 'shadow-button-up'
              }`}
              style={{
                background: metronomeOn
                  ? 'radial-gradient(circle at 45% 40%, #5a7a9a, #4a6a8a 50%, #3a5a7a 100%)'
                  : 'radial-gradient(circle at 42% 38%, #b0a898, #908880 50%, #706860 100%)',
              }}
              title={metronomeOn ? 'Stop metronome' : 'Start metronome'}
            >
              <StatusLED active={metronomeOn} color={metronomeAudible ? 'green' : 'amber'} size="sm" />
            </button>
            <span className="text-[7px] font-label uppercase tracking-wider text-engraved font-bold">
              Metro
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
