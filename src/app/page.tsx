"use client";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { CanvasSidebar } from "../components/CanvasSidebar";
import { ChatAssistant } from "../components/ChatAssistant";
import { AuthWrapper } from "../components/AuthWrapper";
import { useSession } from "next-auth/react";
import { useCanvasSync } from "../hooks/useCanvasSync";

type CanvasTab = { id: string; name: string; persistenceKey: string };
type ChatSession = { id: string; title: string };

export default function Home() {
  const { data: session } = useSession()
  const [canvases, setCanvases] = useState<CanvasTab[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false)
  const [chatSidebarOpen, setChatSidebarOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  // Load user's canvases and chat sessions from database
  useEffect(() => {
    if (!session?.user?.id) return

    async function loadUserData() {
      try {
        // Load canvases
        const canvasResponse = await fetch("/api/canvases")
        if (canvasResponse.ok) {
          const userCanvases = await canvasResponse.json()
          if (userCanvases.length > 0) {
            setCanvases(userCanvases)
            setActiveId(userCanvases[0].id)
          } else {
            // Create first canvas for new user
            await addCanvas()
          }
        }

        // Load chat sessions
        const chatResponse = await fetch("/api/chat-sessions")
        if (chatResponse.ok) {
          const userChats = await chatResponse.json()
          if (userChats.length > 0) {
            setChatSessions(userChats)
            setActiveChatId(userChats[0].id)
          } else {
            // Create first chat session for new user
            await addChatSession()
          }
        }
      } catch (error) {
        console.error("Failed to load user data:", error)
        // Create default canvas and chat if loading fails
        await addCanvas()
        await addChatSession()
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [session?.user?.id])

  const active = canvases.find((c) => c.id === activeId) ?? canvases[0] ?? null;

  // Sync active canvas changes to database
  useCanvasSync(editor, activeId);

  async function addCanvas() {
    // Find next available canvas number to avoid duplicates
    const existingNumbers = canvases
      .map(c => c.name.match(/^Canvas (\d+)$/))
      .filter(match => match)
      .map(match => parseInt(match![1]))
    
    const nextNumber = existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1
    const name = `Canvas ${nextNumber}`
    const persistenceKey = `canvas-${Date.now()}-${crypto.randomUUID()}`
    
    try {
      const response = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, persistenceKey })
      })
      
      if (response.ok) {
        const newCanvas = await response.json()
        setCanvases((v) => [...v, newCanvas])
        setActiveId(newCanvas.id)
      }
    } catch (error) {
      console.error("Failed to create canvas:", error)
    }
  }

  async function addChatSession() {
    // Find next available chat number to avoid duplicates
    const existingNumbers = chatSessions
      .map(c => c.title.match(/^Chat (\d+)$/))
      .filter(match => match)
      .map(match => parseInt(match![1]))
    
    const nextNumber = existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1
    const title = `Chat ${nextNumber}`
    
    try {
      const response = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      })
      
      if (response.ok) {
        const newChat = await response.json()
        setChatSessions((v) => [...v, newChat])
        setActiveChatId(newChat.id)
      }
    } catch (error) {
      console.error("Failed to create chat session:", error)
    }
  }

  async function deleteCanvas(id: string) {
    try {
      const response = await fetch(`/api/canvases/${id}`, {
        method: "DELETE"
      })
      
      if (response.ok) {
        const next = canvases.filter((c) => c.id !== id)
        setCanvases(next)
        // If the active canvas was deleted, select the first remaining canvas (if any)
        if (!next.some((c) => c.id === activeId)) {
          setActiveId(next[0]?.id ?? "")
        }
      }
    } catch (error) {
      console.error("Failed to delete canvas:", error)
    }
  }

  async function renameCanvas(id: string, name: string) {
    try {
      const response = await fetch(`/api/canvases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      })
      
      if (response.ok) {
        setCanvases((v) => v.map((c) => (c.id === id ? { ...c, name } : c)))
      }
    } catch (error) {
      console.error("Failed to rename canvas:", error)
    }
  }

  async function resetEverything() {
    try {
      // Delete all canvases and chat sessions from database in parallel
      await Promise.all([
        fetch("/api/canvases", { method: "DELETE" }),
        fetch("/api/chat-sessions", { method: "DELETE" })
      ])
      
      // Clear local state FIRST
      setCanvases([])
      setActiveId("")
      setEditor(null)
      setChatSessions([])
      setActiveChatId("")
      setLeftCollapsed(false)
      setChatSidebarOpen(false)
      
      // Wait a moment for state to update, then create defaults
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Create Canvas 1 and Chat 1 explicitly
      const canvas1Name = "Canvas 1"
      const chat1Name = "Chat 1"
      const persistenceKey = `canvas-${Date.now()}-${crypto.randomUUID()}`
      
      // Create Canvas 1
      const canvasResponse = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: canvas1Name, persistenceKey })
      })
      
      if (canvasResponse.ok) {
        const newCanvas = await canvasResponse.json()
        setCanvases([newCanvas])
        setActiveId(newCanvas.id)
      }
      
      // Create Chat 1
      const chatResponse = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: chat1Name })
      })
      
      if (chatResponse.ok) {
        const newChat = await chatResponse.json()
        setChatSessions([newChat])
        setActiveChatId(newChat.id)
      }
      
    } catch (error) {
      console.error("Reset failed:", error)
    }
  }

  async function exportCanvas(name: string): Promise<Blob | null> {
    if (!name) return null;
    const target = canvases.find((c) => c.name === name);
    if (!target) return null;
    if (active && target.id === active.id && editor) {
      const ids = Array.from(editor.getCurrentPageShapeIds());
      const result = await editor.toImage(ids);
      return result.blob;
    }
    // Export a non-active canvas via an offscreen Tldraw instance
    return new Promise<Blob | null>((resolve) => {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "-10000px";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);

      const root = createRoot(container);
      const handleMount = (ed: Editor) => {
        try {
          // wait one tick for persisted state to hydrate
          setTimeout(async () => {
            try {
              const ids = Array.from(ed.getCurrentPageShapeIds());
              const result = await ed.toImage(ids);
              resolve(result.blob);
            } catch {
              resolve(null);
            } finally {
              root.unmount();
              document.body.removeChild(container);
            }
          }, 0);
        } catch {
          root.unmount();
          document.body.removeChild(container);
          resolve(null);
        }
      };

      root.render(
        <div style={{ width: "800px", height: "600px" }}>
          <Tldraw persistenceKey={target.persistenceKey} onMount={handleMount} />
        </div>
      );
    });
  }

  async function exportAllAsPdf() {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const names = canvases.map((c) => c.name);
      const blobs: { name: string; blob: Blob }[] = [];
      for (const name of names) {
        const blob = await exportCanvas(name);
        if (blob) blobs.push({ name, blob });
      }
      if (blobs.length === 0) return;

      const pdfDoc = await PDFDocument.create();
      for (const item of blobs) {
        const bytes = new Uint8Array(await item.blob.arrayBuffer());
        const png = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([png.width, png.height]);
        page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
      }
      const dataUri = await pdfDoc.saveAsBase64({ dataUri: true });
      const a = document.createElement("a");
      a.href = dataUri;
      a.download = "canvases.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  }

  if (loading) {
    return (
      <AuthWrapper>
        <div className="h-full flex items-center justify-center">
          <div className="text-neutral-600">Loading your canvases...</div>
        </div>
      </AuthWrapper>
    )
  }

  return (
    <AuthWrapper>
      <div className="h-full w-full grid gap-3 p-4" style={{ gridTemplateColumns: leftCollapsed ? "12px 1fr 380px" : "260px 1fr 380px" }}>
        {leftCollapsed ? (
          <div className="rounded-2xl border bg-white shadow-sm relative flex items-center justify-center pointer-events-none">
            <button
              className="pointer-events-auto w-4 h-8 flex items-center justify-center text-[10px] leading-none text-neutral-900 rounded border border-neutral-400 bg-neutral-200 hover:bg-neutral-300 shadow-sm"
              title="Show canvases"
              aria-label="Show canvases"
              onClick={() => setLeftCollapsed(false)}
            >
              ›
            </button>
          </div>
        ) : (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col relative">
          <div className="p-3 border-b border-neutral-200 flex items-center justify-between bg-white text-neutral-900">
            <div className="font-semibold text-neutral-900">Canvases</div>
            <div className="flex items-center gap-2">
              <button onClick={addCanvas} className="text-xs rounded-md bg-neutral-900 text-white px-2 py-1">New</button>
              <button
                className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                title="Reset everything"
                onClick={resetEverything}
              >
                Reset
              </button>
            </div>
          </div>
          <CanvasSidebar
            canvases={canvases}
            activeId={activeId}
            onSelect={setActiveId}
            onRename={renameCanvas}
            onDelete={deleteCanvas}
            onReferAll={async () => {
              const names = canvases.map((c) => c.name)
              const event = new Event('submit') as any
            }}
            onExportAll={exportAllAsPdf}
          />
          <button
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-6 h-6 rounded-full border border-neutral-400 bg-neutral-200 shadow flex items-center justify-center text-xs text-neutral-900 hover:bg-neutral-300"
            title="Hide canvases"
            aria-label="Hide canvases"
            onClick={() => setLeftCollapsed(true)}
          >
            ‹
          </button>
        </div>
        )}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {active ? (
            <Tldraw key={active.persistenceKey} persistenceKey={active.persistenceKey} onMount={setEditor} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
              No canvases. Click "New" to create one.
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-2 border-b border-neutral-200 flex items-center justify-end">
            <button className="text-xs px-2 py-1 rounded border font-semibold text-neutral-900" onClick={() => setChatSidebarOpen((v) => !v)}>
              {chatSidebarOpen ? 'Hide history' : 'Show history'}
            </button>
          </div>
          <div className="flex-1 flex min-h-0">
          {chatSidebarOpen && (
          <div className="w-40 border-r border-neutral-200 p-2 space-y-2 text-neutral-900">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-neutral-900">Chats</div>
              <button
                className="w-6 h-6 rounded-full bg-neutral-900 text-white text-sm"
                title="New chat"
                onClick={addChatSession}
              >
                +
              </button>
            </div>
            <div className="space-y-1 overflow-auto">
              {chatSessions.map((s) => (
                <button
                  key={s.id}
                  className={`w-full text-left text-sm px-2 py-1 rounded-md font-semibold ${
                    s.id === activeChatId
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-900 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                  onClick={() => setActiveChatId(s.id)}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
          )}
          <div className="flex-1 min-w-0">
            <ChatAssistant 
              key={activeChatId} 
              chatSessionId={activeChatId}
              listCanvasNames={canvases.map((c) => c.name)} 
              exportCanvas={exportCanvas} 
            />
          </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}