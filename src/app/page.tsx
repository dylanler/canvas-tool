"use client";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { CanvasSidebar } from "../components/CanvasSidebar";
import { ChatAssistant } from "../components/ChatAssistant";

type CanvasTab = { id: string; name: string; persistenceKey: string };

export default function Home() {
  const [canvases, setCanvases] = useState<CanvasTab[]>([
    { id: "1", name: "Canvas 1", persistenceKey: "canvas-1" },
  ]);
  const [activeId, setActiveId] = useState<string>("1");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [chatSessions, setChatSessions] = useState<{ id: string; title: string }[]>([{ id: "default", title: "Chat 1" }]);
  const [activeChatId, setActiveChatId] = useState<string>("default");
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false)
  const [chatSidebarOpen, setChatSidebarOpen] = useState<boolean>(true)
  useEffect(() => {
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

  const active = canvases.find((c) => c.id === activeId)!;

  function addCanvas() {
    const idx = canvases.length + 1;
    const next = { id: crypto.randomUUID(), name: `Canvas ${idx}`, persistenceKey: `canvas-${idx}` };
    setCanvases((v) => [...v, next]);
    setActiveId(next.id);
  }

  async function exportCanvas(name: string): Promise<Blob | null> {
    if (!name) return null;
    const target = canvases.find((c) => c.name === name);
    if (!target) return null;
    if (target.id === active.id && editor) {
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

  return (
    <div className="h-screen w-screen grid gap-3 p-4" style={{ gridTemplateColumns: leftCollapsed ? "24px 1fr 380px" : "260px 1fr 380px" }}>
      {leftCollapsed ? (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex items-center justify-center">
          <button className="text-xs px-2 py-1" title="Show canvases" onClick={() => setLeftCollapsed(false)}>›</button>
        </div>
      ) : (
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-neutral-200 flex items-center justify-between bg-white text-neutral-900">
          <div className="font-semibold text-neutral-900">Canvases</div>
          <div className="flex items-center gap-2">
            <button onClick={addCanvas} className="text-sm rounded bg-neutral-900 text-white px-2 py-1">New</button>
            <button className="text-xs px-2 py-1 rounded border" onClick={() => setLeftCollapsed(true)}>Hide</button>
          </div>
        </div>
        <CanvasSidebar
          canvases={canvases}
          activeId={activeId}
          onSelect={setActiveId}
          onRename={(id, name) => setCanvases((v) => v.map((c) => (c.id === id ? { ...c, name } : c)))}
          onDelete={(id) => setCanvases((v) => v.filter((c) => c.id !== id))}
          onReferAll={async () => {
            // Build a composite message that attaches all canvases as images
            const names = canvases.map((c) => c.name)
            // We will leverage ChatAssistant mention detection by appending all @names to a hidden event
            const event = new Event('submit') as any
            // no-op; handled inside ChatAssistant via props
          }}
        />
      </div>
      )}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <Tldraw persistenceKey={active.persistenceKey} onMount={setEditor} />
      </div>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-2 border-b border-neutral-200 flex items-center justify-end">
          <button className="text-xs px-2 py-1 rounded border font-semibold text-neutral-900" onClick={() => setChatSidebarOpen((v) => !v)}>
            {chatSidebarOpen ? 'Hide history' : 'Show history'}
          </button>
        </div>
        <div className="flex-1 flex min-h-0">
        {chatSidebarOpen && (
        <div className="w-40 border-r border-neutral-200 p-2 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-neutral-700">Chats</div>
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
                className={`w-full text-left text-xs px-2 py-1 rounded ${s.id === activeChatId ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
                onClick={() => setActiveChatId(s.id)}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
        )}
        <div className="flex-1 min-w-0">
          <ChatAssistant listCanvasNames={canvases.map((c) => c.name)} exportCanvas={exportCanvas} />
        </div>
        </div>
      </div>
    </div>
  );
}
