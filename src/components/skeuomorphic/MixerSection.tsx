import { Track } from '../../types'
import { TRACK_COLORS } from '../../skins'
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
    <div className="recorder-mixer-scroll flex flex-col flex-shrink-0">
      {/* Channel strips sit in a shallow recess in the faceplate */}
      <div className="recorder-mixer-bank flex flex-1 rounded-md"
        style={{
          background: 'var(--mixer-bg)',
          boxShadow: `
            inset 0 3px 8px rgba(20,15,5,0.3),
            inset 0 -2px 4px rgba(255,250,240,0.06),
            inset 2px 0 4px rgba(20,15,5,0.1),
            inset -2px 0 4px rgba(20,15,5,0.1),
            0 1px 0 rgba(255,250,240,0.1)
          `,
        }}
      >
        {tracks.map((track, i) => (
          <div key={track.id} style={i > 0 ? { borderLeft: '1px solid var(--divider)' } : undefined}>
            <ChannelStrip
              track={track}
              color={TRACK_COLORS[i % TRACK_COLORS.length]}
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
