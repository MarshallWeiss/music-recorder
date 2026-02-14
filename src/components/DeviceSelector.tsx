import { AudioDevice } from '../audio/AudioEngine'

interface DeviceSelectorProps {
  devices: AudioDevice[]
  selectedDeviceId: string | null
  onSelect: (deviceId: string) => void
}

export default function DeviceSelector({ devices, selectedDeviceId, onSelect }: DeviceSelectorProps) {
  if (devices.length === 0) {
    return <span className="text-gray-500 text-sm">No audio devices found</span>
  }

  return (
    <select
      value={selectedDeviceId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-gray-800 text-gray-300 text-sm rounded px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-gray-500"
    >
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label}
        </option>
      ))}
    </select>
  )
}
