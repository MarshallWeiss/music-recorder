import { useState, useCallback } from 'react'
import { Tuning, TUNING_GROUPS, getTuningsByGroup, isValidNoteString } from '../../audio/tunings'

interface TuningDropdownProps {
  allTunings: Tuning[]
  currentTuning: Tuning
  onSelect: (tuning: Tuning) => void
  onSaveCustom: (tuning: Tuning) => void
  onDeleteCustom: (tuning: Tuning) => void
}

const DEFAULT_STRINGS = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

export default function TuningDropdown({
  allTunings,
  currentTuning,
  onSelect,
  onSaveCustom,
  onDeleteCustom,
}: TuningDropdownProps) {
  const [editing, setEditing] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customStrings, setCustomStrings] = useState<string[]>([...DEFAULT_STRINGS])

  const grouped = getTuningsByGroup(allTunings)

  const allValid = customName.trim().length > 0 && customStrings.every(isValidNoteString)
  const nameCollision = allTunings.some(
    t => t.name.toLowerCase() === customName.trim().toLowerCase() && t.group !== 'custom'
  )

  const handleSave = useCallback(() => {
    if (!allValid || nameCollision) return
    onSaveCustom({
      name: customName.trim(),
      shortName: customName.trim().slice(0, 6).toUpperCase(),
      strings: [...customStrings],
      group: 'custom',
    })
    setEditing(false)
    setCustomName('')
    setCustomStrings([...DEFAULT_STRINGS])
  }, [allValid, nameCollision, customName, customStrings, onSaveCustom])

  const handleStringChange = useCallback((index: number, value: string) => {
    setCustomStrings(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  return (
    <div
      className="absolute top-full mt-1 right-0 z-50 rounded shadow-lg py-1"
      style={{
        width: 180,
        maxHeight: 280,
        overflowY: 'auto',
        background: 'linear-gradient(180deg, #e8e0d0 0%, #d8d0c0 100%)',
        border: '1px solid #a09888',
        scrollbarWidth: 'thin',
        scrollbarColor: '#a09888 transparent',
      }}
    >
      {TUNING_GROUPS.map(group => {
        const tunings = grouped.get(group.key)
        if (!tunings || tunings.length === 0) return null
        return (
          <div key={group.key}>
            <div
              className="px-3 pt-2 pb-0.5 text-[8px] font-label uppercase tracking-wider font-bold"
              style={{ color: '#8a7a60' }}
            >
              {group.label}
            </div>
            {tunings.map(tuning => (
              <div key={tuning.name} className="flex items-center group">
                <button
                  onClick={() => onSelect(tuning)}
                  className={`flex-1 text-left px-3 py-1 text-[10px] font-label hover:bg-hw-300/50 transition-colors ${
                    tuning.name === currentTuning.name ? 'bg-hw-400/30 font-bold' : ''
                  }`}
                  style={{ color: '#4a3a28' }}
                >
                  {tuning.name}
                </button>
                {tuning.group === 'custom' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteCustom(tuning)
                    }}
                    className="px-2 py-1 text-[10px] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                    style={{ color: '#8a5a4a' }}
                    title="Delete custom tuning"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Custom tuning editor */}
      <div className="border-t mt-1 pt-1" style={{ borderColor: '#a09888' }}>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left px-3 py-1 text-[10px] font-label hover:bg-hw-300/50 transition-colors"
            style={{ color: '#6a5a48' }}
          >
            + Custom Tuning
          </button>
        ) : (
          <div className="px-3 py-2 space-y-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Tuning name"
              className="w-full text-[10px] px-2 py-1 rounded border font-label"
              style={{
                background: 'rgba(255,255,255,0.8)',
                borderColor: nameCollision ? '#c53030' : '#a09888',
                color: '#4a3a28',
              }}
              autoFocus
            />
            {nameCollision && (
              <div className="text-[8px] font-label" style={{ color: '#c53030' }}>
                Name conflicts with a built-in tuning
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              {[5, 4, 3, 2, 1, 0].map(i => (
                <div key={i} className="flex items-center gap-0.5">
                  <span className="text-[8px] font-label font-bold" style={{ color: '#8a7a60', width: 8 }}>
                    {6 - i}
                  </span>
                  <input
                    type="text"
                    value={customStrings[i]}
                    onChange={(e) => handleStringChange(i, e.target.value)}
                    placeholder="E2"
                    className="w-full text-[10px] px-1 py-0.5 rounded border font-mono text-center"
                    style={{
                      background: 'rgba(255,255,255,0.8)',
                      borderColor: customStrings[i] && !isValidNoteString(customStrings[i]) ? '#c53030' : '#a09888',
                      color: '#4a3a28',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                disabled={!allValid || nameCollision}
                className="flex-1 text-[9px] font-label font-bold py-1 rounded transition-all"
                style={{
                  background: allValid && !nameCollision
                    ? 'linear-gradient(180deg, #6a8a5a 0%, #5a7a4a 100%)'
                    : 'linear-gradient(180deg, #b0a898 0%, #a09888 100%)',
                  color: allValid && !nameCollision ? '#fff' : '#888',
                  cursor: allValid && !nameCollision ? 'pointer' : 'default',
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setCustomName('')
                  setCustomStrings([...DEFAULT_STRINGS])
                }}
                className="flex-1 text-[9px] font-label py-1 rounded transition-all hover:bg-hw-300/50"
                style={{ color: '#6a5a48' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
