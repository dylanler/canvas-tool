"use client";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { CanvasSidebar } from "../components/CanvasSidebar";
import { ChatAssistant } from "../components/ChatAssistant";

type CanvasTab = { id: string; name: string; persistenceKey: string };

export default function Home() {
  // Session-scoped ID to ensure all persistenceKeys are unique per reset/session
  const [sessionId, setSessionId] = useState<string>("")
  const [canvases, setCanvases] = useState<CanvasTab[]>([
    { id: "1", name: "Canvas 1", persistenceKey: `canvas-1-${typeof crypto !== 'undefined' && (crypto as any).randomUUID ? crypto.randomUUID() : Date.now()}` },
  ]);
  const [activeId, setActiveId] = useState<string>("1");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [chatSessions, setChatSessions] = useState<{ id: string; title: string }[]>([{ id: "default", title: "Chat 1" }]);
  const [activeChatId, setActiveChatId] = useState<string>("default");
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false)
  const [chatSidebarOpen, setChatSidebarOpen] = useState<boolean>(false)
  useEffect(() => {
    // Initialize or reuse a per-session ID so new canvases never collide with old persisted data
    try {
      const existing = window.sessionStorage.getItem("canvasSessionId")
      if (existing) {
        setSessionId(existing)
      } else {
        const sid = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? crypto.randomUUID() : String(Date.now())
        window.sessionStorage.setItem("canvasSessionId", sid)
        setSessionId(sid)
      }
    } catch {
      // fallback ephemeral session id
      setSessionId(String(Date.now()))
    }

    // load from localStorage after mount
    try {
      const saved = window.localStorage.getItem("canvases");
      if (saved) {
        const parsed: CanvasTab[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCanvases(parsed);
          setActiveId(parsed[0].id);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("canvases", JSON.stringify(canvases));
    } catch {}
  }, [canvases]);

  const active = canvases.find((c) => c.id === activeId) ?? canvases[0] ?? null;

  function addCanvas() {
    const idx = canvases.length + 1;
    const uniqueSuffix = sessionId || ((typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? crypto.randomUUID() : String(Date.now()))
    const next = { id: crypto.randomUUID(), name: `Canvas ${idx}`, persistenceKey: `canvas-${idx}-${uniqueSuffix}` };
    setCanvases((v) => [...v, next]);
    setActiveId(next.id);
  }

  function deleteCanvas(id: string) {
    const next = canvases.filter((c) => c.id !== id)
    setCanvases(next)
    // If the active canvas was deleted, select the first remaining canvas (if any)
    if (!next.some((c) => c.id === activeId)) {
      setActiveId(next[0]?.id ?? "")
    }
  }

  async function resetEverything() {
    // Best-effort purge of any Tldraw-related IndexedDB databases so all pages are removed
    const previousKeys = canvases.map((c) => c.persistenceKey)
    try {
      const anyIDB: any = indexedDB as any
      if (anyIDB && typeof anyIDB.databases === "function") {
        const dbs: { name?: string }[] = await anyIDB.databases()
        for (const db of dbs) {
          const name = db?.name || ""
          if (!name) continue
          if (
            name.toLowerCase().includes("tldraw") ||
            previousKeys.some((k) => name.includes(k))
          ) {
            try { indexedDB.deleteDatabase(name) } catch {}
          }
        }
      } else {
        // Fallback: try common tldraw naming patterns with known keys
        for (const key of previousKeys) {
          try { indexedDB.deleteDatabase(`tldraw-${key}`) } catch {}
          try { indexedDB.deleteDatabase(key) } catch {}
        }
      }
    } catch {}

    // Clear app-local persistence references and start a brand new session so no old IndexedDB data is reused
    try {
      window.localStorage.removeItem("canvases");
    } catch {}
    try {
      const newSession = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? crypto.randomUUID() : String(Date.now())
      window.sessionStorage.setItem("canvasSessionId", newSession)
      setSessionId(newSession)
    } catch {
      const newSession = String(Date.now())
      setSessionId(newSession)
    }

    const first = { id: crypto.randomUUID(), name: "Canvas 1", persistenceKey: `canvas-1-${(typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? crypto.randomUUID() : String(Date.now())}` };
    setCanvases([first]);
    setActiveId(first.id);
    setEditor(null);
    setChatSessions(() => {
      const id = crypto.randomUUID();
      setActiveChatId(id);
      return [{ id, title: "Chat 1" }];
    });
    setLeftCollapsed(false);
    setChatSidebarOpen(false);
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
      const pdfBytes = await pdfDoc.save();
      const outBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "canvases.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }

  return (
    <div className="h-screen w-screen grid gap-3 p-4" style={{ gridTemplateColumns: leftCollapsed ? "12px 1fr 380px" : "260px 1fr 380px" }}>
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
          onRename={(id, name) => setCanvases((v) => v.map((c) => (c.id === id ? { ...c, name } : c)))}
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
              onClick={() => {
                setChatSessions((prev) => {
                  const id = crypto.randomUUID();
                  const next = [{ id, title: `Chat ${prev.length + 1}` }, ...prev].slice(0, 5);
                  setActiveChatId(id);
                  return next;
                });
              }}
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
          <ChatAssistant key={activeChatId} listCanvasNames={canvases.map((c) => c.name)} exportCanvas={exportCanvas} />
        </div>
        </div>
      </div>
    </div>
  );
}
