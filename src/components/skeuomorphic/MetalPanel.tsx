import { useState, useCallback } from 'react'
import { AudioEngine } from '../../audio/AudioEngine'
import { useTuner } from '../../hooks/useTuner'
import { TUNINGS } from '../../audio/tunings'
import VUMeter from './VUMeter'
import TunerDisplay from './TunerDisplay'
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
}: MetalPanelProps) {
  const tuner = useTuner(engine)
  const [tuningIndex, setTuningIndex] = useState(0)
  const currentTuning = TUNINGS[tuningIndex]
  const cycleTuning = useCallback(() => {
    setTuningIndex((i) => (i + 1) % TUNINGS.length)
  }, [])

  // Get analyser for VU meters
  // During playback: average all track analysers
  // During recording: use input analyser
  const getLeftAnalyser = () => {
    if (!engine) return null
    if (isRecording) return engine.getInputAnalyser()
    if (isPlaying) return engine.getAnalyser(0) ?? engine.getAnalyser(1)
    return null
  }

  const getRightAnalyser = () => {
    if (!engine) return null
    if (isRecording) return engine.getInputAnalyser()
    if (isPlaying) return engine.getAnalyser(2) ?? engine.getAnalyser(1) ?? engine.getAnalyser(0)
    return null
  }

  // BPM knob: map 60-200 to 0-1
  const bpmToKnob = (b: number) => (b - 60) / 140
  const knobToBpm = (v: number) => Math.round(60 + v * 140)

  // Input gain knob: map 0-10 to 0-1
  // Range gives ~+20dB max boost for quiet internal mics
  const gainToKnob = (g: number) => g / 10
  const knobToGain = (v: number) => v * 10

  return (
    <div className="texture-metal rounded-t-sm px-6 py-4 flex items-center gap-6">
      {/* VU Meters */}
      <div className="flex items-center gap-3">
        <VUMeter analyser={getLeftAnalyser()} label="VU" width={180} height={110} />
        <VUMeter analyser={getRightAnalyser()} label="VU" width={180} height={110} />
      </div>

      {/* Tuner */}
      <TunerDisplay tuner={tuner} tuning={currentTuning} onCycleTuning={cycleTuning} width={120} height={110} />

      <div className="flex-1" />

      {/* Master knobs */}
      <div className="flex items-center gap-5">
        {/* Input gain */}
        <RotaryKnob
          value={gainToKnob(inputGain)}
          onChange={(v) => setInputGain(knobToGain(v))}
          label="Input"
          size="lg"
          ticks={9}
        />

        {/* BPM / Tempo */}
        <div className="flex flex-col items-center gap-0.5">
          <RotaryKnob
            value={bpmToKnob(bpm)}
            onChange={(v) => setBpm(knobToBpm(v))}
            label="Tempo"
            size="lg"
            ticks={9}
          />
          <span className="text-[9px] font-mono text-hw-600 font-bold">{bpm}</span>
        </div>

        {/* Metronome + Count-in */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            {/* Metronome on/off */}
            <button
              onClick={toggleMetronome}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                metronomeOn ? 'shadow-button-down' : 'shadow-button-up'
              }`}
              style={{
                background: metronomeOn
                  ? 'radial-gradient(circle, #4a6a8a 0%, #3a5a7a 100%)'
                  : 'radial-gradient(circle at 38% 35%, #b0a898, #807870 100%)',
              }}
              title={metronomeOn ? 'Stop metronome' : 'Start metronome'}
            >
              <StatusLED active={metronomeOn} color={metronomeAudible ? 'green' : 'amber'} size="sm" />
            </button>

            {/* Audio/Visual toggle (only visible when metronome is on) */}
            {metronomeOn && (
              <button
                onClick={toggleMetronomeAudible}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  !metronomeAudible ? 'shadow-button-down' : 'shadow-button-up'
                }`}
                style={{
                  background: !metronomeAudible
                    ? 'radial-gradient(circle, #8a7a4a 0%, #6a5a3a 100%)'
                    : 'radial-gradient(circle at 38% 35%, #a09888, #706860 100%)',
                }}
                title={metronomeAudible ? 'Switch to visual-only (silent)' : 'Switch to audible clicks'}
              >
                {/* Speaker icon: muted or not */}
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={metronomeAudible ? 'rgba(0,0,0,0.4)' : 'rgba(200,180,100,0.8)'} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 4.5h1.5L6 2.5v7l-2.5-2H2v-3z" fill={metronomeAudible ? 'rgba(0,0,0,0.2)' : 'rgba(200,180,100,0.4)'} />
                  {!metronomeAudible && <path d="M8 4l3 3M11 4l-3 3" />}
                  {metronomeAudible && <path d="M8.5 3.5a3.5 3.5 0 0 1 0 5" />}
                </svg>
              </button>
            )}
          </div>

          <BeatIndicator currentBeat={currentBeat} metronomeOn={metronomeOn} />

          <div className="flex items-center gap-2">
            <span className="text-[8px] font-label uppercase tracking-wider text-engraved font-bold">
              Metro
            </span>
          </div>

          {/* Count-in toggle */}
          <button
            onClick={toggleCountIn}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
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
            <span className="text-[7px] font-label uppercase tracking-wider font-bold" style={{ color: countInEnabled ? 'rgba(200,180,100,0.9)' : 'rgba(0,0,0,0.3)' }}>
              Count In
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
