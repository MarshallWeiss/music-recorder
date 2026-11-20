import { MACHINES, MachineId } from '../machines'

interface MachinePickerProps {
  machine: MachineId
  onChange: (machine: MachineId) => void
}

export default function MachinePicker({ machine, onChange }: MachinePickerProps) {
  return (
    <label className="machine-picker">
      <span>Machine</span>
      <select value={machine} onChange={(event) => onChange(event.target.value as MachineId)}>
        {MACHINES.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  )
}
