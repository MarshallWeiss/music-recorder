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
      {/* Channel strips container */}
      <div className="flex flex-1 rounded"
        style={{
          background: 'linear-gradient(180deg, #dcd0b8 0%, #d0c4ac 30%, #c8bca4 70%, #c0b49c 100%)',
          boxShadow: `
            inset 0 3px 8px rgba(20,15,5,0.3),
            inset 0 -2px 4px rgba(255,250,240,0.08),
            inset 2px 0 4px rgba(20,15,5,0.1),
            inset -2px 0 4px rgba(20,15,5,0.1),
            0 1px 0 rgba(255,250,240,0.1)
          `,
        }}
      >
        {tracks.map((track, i) => (
          <div key={track.id} className={`${i > 0 ? 'border-l border-hw-400/20' : ''}`}>
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
