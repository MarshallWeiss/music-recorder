import { useState } from 'react'

interface SessionMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface SessionDrawerProps {
  sessions: SessionMeta[]
  currentSessionId: string | null
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onSave: () => void
  onExport: () => void
  isSaving: boolean
  isExporting: boolean
  hasRecordedTracks: boolean
}

function MiniCassette({
  session,
  isCurrent,
  onLoad,
  onDelete,
}: {
  session: SessionMeta
  isCurrent: boolean
  onLoad: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`relative rounded p-2 cursor-pointer transition-all hover:brightness-110 ${
        isCurrent ? 'ring-1 ring-hw-400' : ''
      }`}
      style={{
        width: 110,
        height: 72,
        background: 'linear-gradient(180deg, #444038 0%, #3a3632 30%, #302c28 100%)',
        flexShrink: 0,
      }}
      onClick={onLoad}
    >
      {/* Mini reels */}
      <div className="flex justify-between px-2 mt-0.5">
        <div className="w-4 h-4 rounded-full" style={{ background: '#1a1816', border: '1px solid #555' }} />
        <div className="w-4 h-4 rounded-full" style={{ background: '#1a1816', border: '1px solid #555' }} />
      </div>

      {/* Label */}
      <div
        className="mx-2 mt-1.5 rounded-sm px-1.5 py-0.5"
        style={{ background: '#f0e8d0' }}
      >
        <div className="text-[8px] font-mono text-hw-800 truncate leading-tight">
          {session.name}
        </div>
        <div className="text-[6px] text-hw-500 leading-tight">
          {new Date(session.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (confirm('Delete this session?')) onDelete()
        }}
        className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-hw-500 hover:text-red-400 hover:bg-black/30 transition-colors"
        title="Delete"
      >
        ×
      </button>

      {/* Current indicator */}
      {isCurrent && (
        <div className="absolute bottom-1 right-2 text-[6px] text-hw-400 uppercase tracking-wider font-bold">
          ▸
        </div>
      )}
    </div>
  )
}

export default function SessionDrawer({
  sessions,
  currentSessionId,
  onLoad,
  onDelete,
  onNew,
  onSave,
  onExport,
  isSaving,
  isExporting,
  hasRecordedTracks,
}: SessionDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      {/* Trigger button */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          onClick={() => setOpen(!open)}
          className={`px-3 py-1 rounded-sm text-[9px] font-label uppercase tracking-wider font-bold transition-all ${
            open ? 'shadow-button-down' : 'shadow-button-up'
          }`}
          style={{
            background: open
              ? 'linear-gradient(180deg, #a09888 0%, #908878 100%)'
              : 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)',
          }}
        >
          <span className="text-engraved">
            Tapes{sessions.length > 0 ? ` (${sessions.length})` : ''}
          </span>
        </button>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-2 py-0.5 rounded-sm text-[8px] font-label uppercase tracking-wider font-bold shadow-button-up hover:brightness-110 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)' }}
        >
          <span className="text-engraved">{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        <button
          onClick={onExport}
          disabled={isExporting || !hasRecordedTracks}
          className="px-2 py-0.5 rounded-sm text-[8px] font-label uppercase tracking-wider font-bold shadow-button-up hover:brightness-110 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)' }}
        >
          <span className="text-engraved">{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>

        <button
          onClick={onNew}
          className="px-2 py-0.5 rounded-sm text-[8px] font-label uppercase tracking-wider font-bold shadow-button-up hover:brightness-110 transition-all"
          style={{ background: 'linear-gradient(180deg, #c0b8a8 0%, #a8a090 100%)' }}
        >
          <span className="text-engraved">New</span>
        </button>
      </div>

      {/* Drawer panel */}
      {open && (
        <div
          className="shadow-inset-groove rounded-sm mx-2 mb-2 p-2 overflow-x-auto"
          style={{
            background: 'linear-gradient(180deg, #1a1816 0%, #222018 100%)',
            maxHeight: 120,
          }}
        >
          {sessions.length === 0 ? (
            <div className="text-[9px] text-hw-500 text-center py-4 font-label">
              No saved sessions. Record something and it will auto-save.
            </div>
          ) : (
            <div className="flex gap-2 pb-1">
              {sessions.map((s) => (
                <MiniCassette
                  key={s.id}
                  session={s}
                  isCurrent={s.id === currentSessionId}
                  onLoad={() => {
                    onLoad(s.id)
                    setOpen(false)
                  }}
                  onDelete={() => onDelete(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
