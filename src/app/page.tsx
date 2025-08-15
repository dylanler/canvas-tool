"use client";
import { useEffect, useState } from "react";
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
    // For MVP we only export the active canvas. Non-active export can be added later with a hidden mount.
    return null;
  }

  return (
    <div className="h-screen w-screen grid grid-cols-[260px_1fr_380px] gap-3 p-4">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">Canvases</div>
          <button onClick={addCanvas} className="text-sm rounded bg-neutral-900 text-white px-2 py-1">New</button>
        </div>
        <CanvasSidebar
          canvases={canvases}
          activeId={activeId}
          onSelect={setActiveId}
          onRename={(id, name) => setCanvases((v) => v.map((c) => (c.id === id ? { ...c, name } : c)))}
        />
      </div>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <Tldraw persistenceKey={active.persistenceKey} onMount={setEditor} />
      </div>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <ChatAssistant listCanvasNames={canvases.map((c) => c.name)} exportCanvas={exportCanvas} />
      </div>
    </div>
  );
}
