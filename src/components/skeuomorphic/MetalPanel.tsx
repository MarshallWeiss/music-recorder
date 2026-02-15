import { AudioEngine } from '../../audio/AudioEngine'
import VUMeter from './VUMeter'
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
  toggleMetronome: () => void
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
  toggleMetronome,
  currentBeat,
}: MetalPanelProps) {
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

  // Input gain knob: map 0-3 to 0-1
  const gainToKnob = (g: number) => g / 3
  const knobToGain = (v: number) => v * 3

  return (
    <div className="texture-metal rounded-t-sm px-6 py-4 flex items-center gap-6">
      {/* VU Meters */}
      <div className="flex items-center gap-3">
        <VUMeter analyser={getLeftAnalyser()} label="VU" width={180} height={110} />
        <VUMeter analyser={getRightAnalyser()} label="VU" width={180} height={110} />
      </div>

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

        {/* Metronome */}
        <div className="flex flex-col items-center gap-2">
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
            <StatusLED active={metronomeOn} color="green" size="sm" />
          </button>
          <BeatIndicator currentBeat={currentBeat} metronomeOn={metronomeOn} />
          <span className="text-[8px] font-label uppercase tracking-wider text-engraved font-bold">
            Metro
          </span>
        </div>
      </div>
    </div>
  )
}
