import { AudioDevice } from '../audio/AudioEngine'

interface DeviceSelectorProps {
  devices: AudioDevice[]
  selectedDeviceId: string | null
  onSelect: (deviceId: string) => void
}

export default function DeviceSelector({ devices, selectedDeviceId, onSelect }: DeviceSelectorProps) {
  if (devices.length === 0) {
    return <span className="text-[9px] text-hw-500 font-label">No audio devices</span>
  }

  return (
    <select
      value={selectedDeviceId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="text-[9px] font-label rounded-sm px-2 py-1 border outline-none cursor-pointer"
      style={{
        background: 'linear-gradient(180deg, #d8d0c0 0%, #c8c0b0 100%)',
        borderColor: '#a09888',
        color: '#4a3a28',
      }}
    >
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label}
        </option>
      ))}
    </select>
  )
}
