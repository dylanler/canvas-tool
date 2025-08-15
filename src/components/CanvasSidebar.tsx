"use client"
import { useState } from "react"

type Canvas = { id: string; name: string; persistenceKey: string }

export function CanvasSidebar({
  canvases,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onReferAll,
}: {
  canvases: Canvas[]
  activeId: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReferAll: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>("")

  return (
    <div className="flex-1 overflow-auto p-3 space-y-2 bg-white text-neutral-900">
      <div className="pb-2 flex justify-end">
        <button className="text-xs px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-50" onClick={onReferAll}>
          Refer all to chat
        </button>
      </div>
      {canvases.map((c) => (
        <div
          key={c.id}
          className={`border rounded-xl p-3 cursor-pointer ${c.id === activeId ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white"}`}
          onClick={() => onSelect(c.id)}
        >
          {editingId === c.id ? (
            <input
              autoFocus
              className="w-full outline-none text-neutral-900"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                onRename(c.id, draft.trim() || c.name)
                setEditingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(c.id, draft.trim() || c.name)
                  setEditingId(null)
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-neutral-900 truncate">{c.name}</div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-neutral-600 hover:text-neutral-900"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(c.id)
                    setDraft(c.name)
                  }}
                >
                  Rename
                </button>
                <button
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(c.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


