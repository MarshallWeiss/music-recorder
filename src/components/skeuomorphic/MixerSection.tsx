import { Track } from '../../types'
import ChannelStrip from './ChannelStrip'

interface MixerSectionProps {
  tracks: Track[]
  onArmTrack: (trackId: number) => void
  onSetVolume: (trackId: number, volume: number) => void
  onSetPan: (trackId: number, pan: number) => void
  onToggleMute: (trackId: number) => void
  onToggleSolo: (trackId: number) => void
  onClearTrack: (trackId: number) => void
  onRenameTrack: (trackId: number, name: string) => void
}

export default function MixerSection({
  tracks,
  onArmTrack,
  onSetVolume,
  onSetPan,
  onToggleMute,
  onToggleSolo,
  onClearTrack,
  onRenameTrack,
}: MixerSectionProps) {
  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Panel label */}
      <div className="px-2 py-1">
        <span className="text-[8px] font-label uppercase tracking-[0.2em] text-engraved font-bold">
          Mixer
        </span>
      </div>

      {/* Channel strips container */}
      <div className="flex flex-1 shadow-inset-groove rounded-sm mx-1 mb-2"
        style={{
          background: 'linear-gradient(180deg, #d8ccb4 0%, #ccc0a8 100%)',
        }}
      >
        {tracks.map((track, i) => (
          <div key={track.id} className={`${i > 0 ? 'border-l border-hw-400/30' : ''}`}>
            <ChannelStrip
              track={track}
              onArmTrack={() => onArmTrack(track.id)}
              onSetVolume={(v) => onSetVolume(track.id, v)}
              onSetPan={(p) => onSetPan(track.id, p)}
              onToggleMute={() => onToggleMute(track.id)}
              onToggleSolo={() => onToggleSolo(track.id)}
              onClearTrack={() => onClearTrack(track.id)}
              onRenameTrack={(name) => onRenameTrack(track.id, name)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
