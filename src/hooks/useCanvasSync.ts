import { useEffect, useRef } from "react"
import { Editor } from "tldraw"

export function useCanvasSync(editor: Editor | null, canvasId: string) {
  const lastSaveRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!editor || !canvasId) return

    const handleChange = () => {
      // Debounce saves to avoid excessive API calls
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          const snapshot = editor.store.getSnapshot()
          await fetch(`/api/canvases/${canvasId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tldrawData: snapshot })
          })
          lastSaveRef.current = Date.now()
        } catch (error) {
          console.error("Failed to sync canvas:", error)
        }
      }, 2000) // Save 2 seconds after last change
    }

    const cleanup = editor.store.listen(handleChange)
    
    return () => {
      cleanup()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [editor, canvasId])
}