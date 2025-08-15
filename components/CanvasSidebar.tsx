"use client"
import { useState } from "react"

type Canvas = { id: string; name: string; persistenceKey: string }

export function CanvasSidebar({
  canvases,
  activeId,
  onSelect,
  onRename,
}: {
  canvases: Canvas[]
  activeId: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>("")

  return (
    <div className="flex-1 overflow-auto p-3 space-y-2">
      {canvases.map((c) => (
        <div
          key={c.id}
          className={`border rounded-xl p-3 cursor-pointer ${c.id === activeId ? "border-neutral-900" : "border-neutral-200"}`}
          onClick={() => onSelect(c.id)}
        >
          {editingId === c.id ? (
            <input
              autoFocus
              className="w-full outline-none"
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
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.name}</div>
              <button
                className="text-xs text-neutral-500 hover:text-neutral-900"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingId(c.id)
                  setDraft(c.name)
                }}
              >
                Rename
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


