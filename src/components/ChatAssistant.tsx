"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { useChat } from "@ai-sdk/react"

type Props = {
  listCanvasNames: string[]
  exportCanvas: (name: string) => Promise<Blob | null>
}

export function ChatAssistant({ listCanvasNames, exportCanvas }: Props) {
  const [useCustom, setUseCustom] = useState<boolean>(false)
  const [baseURL, setBaseURL] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [model, setModel] = useState<string>("gpt-5-mini")
  const [saveIndicator, setSaveIndicator] = useState<"" | "saved">("")
  const [showApiKey, setShowApiKey] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEnabled = window.localStorage.getItem("customProviderEnabled")
      const storedBase = window.localStorage.getItem("providerBaseURL")
      const storedKey = window.localStorage.getItem("providerApiKey")
      const storedModel = window.localStorage.getItem("providerModel")
      setUseCustom(storedEnabled === "1")
      if (storedBase) setBaseURL(storedBase)
      if (storedKey) setApiKey(storedKey)
      if (storedModel) setModel(storedModel)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("customProviderEnabled", useCustom ? "1" : "0")
    localStorage.setItem("providerBaseURL", baseURL)
    localStorage.setItem("providerApiKey", apiKey)
    localStorage.setItem("providerModel", model)
  }, [useCustom, baseURL, apiKey, model])

  function handleSaveProviderSettings() {
    try {
      window.localStorage.setItem("customProviderEnabled", useCustom ? "1" : "0")
      window.localStorage.setItem("providerBaseURL", baseURL)
      window.localStorage.setItem("providerApiKey", apiKey)
      window.localStorage.setItem("providerModel", model)
      setSaveIndicator("saved")
      setTimeout(() => setSaveIndicator(""), 1500)
    } catch {
      // no-op: localStorage might be unavailable in rare cases
    }
  }

  // basic local chat history retention: keep last 5 chats in-memory for this session only
  const { messages, sendMessage } = useChat({})
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [caret, setCaret] = useState<number>(0)
  const [mentionOpen, setMentionOpen] = useState<boolean>(false)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string>("")
  const [highlightIndex, setHighlightIndex] = useState<number>(0)

  function updateCaretAndMention(nextValue: string, nextCaret: number) {
    setCaret(nextCaret)
    // Determine if we are inside a mention (from last '@' to the caret with no whitespace)
    const uptoCaret = nextValue.slice(0, nextCaret)
    const atIndex = uptoCaret.lastIndexOf("@")
    if (atIndex === -1) {
      setMentionOpen(false)
      setMentionStart(null)
      setMentionQuery("")
      setHighlightIndex(0)
      return
    }
    // Ensure '@' starts a token (start of string or preceded by whitespace)
    const beforeChar = atIndex > 0 ? uptoCaret[atIndex - 1] : ""
    const isTokenStart = atIndex === 0 || /\s/.test(beforeChar)
    // Extract the query between '@' and caret, stop mention if we cross whitespace/newline
    const rawQuery = uptoCaret.slice(atIndex + 1)
    const hasSpace = /\s/.test(rawQuery)
    if (!isTokenStart || hasSpace) {
      setMentionOpen(false)
      setMentionStart(null)
      setMentionQuery("")
      setHighlightIndex(0)
      return
    }
    setMentionOpen(true)
    setMentionStart(atIndex)
    setMentionQuery(rawQuery)
  }

  const filteredMentions = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase()
    const base = listCanvasNames
    if (!q) return base
    return base.filter((n) => n.toLowerCase().includes(q))
  }, [mentionQuery, listCanvasNames])

  function applyMention(name: string) {
    if (mentionStart == null) return
    const before = input.slice(0, mentionStart)
    const after = input.slice(caret)
    const inserted = `@${name} `
    const next = before + inserted + after
    const newCaret = (before + inserted).length
    setInput(next)
    setMentionOpen(false)
    setMentionStart(null)
    setMentionQuery("")
    setHighlightIndex(0)
    // Place caret after the inserted mention
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        try {
          inputRef.current.setSelectionRange(newCaret, newCaret)
        } catch {}
      }
    })
  }

  function insertMention(name: string) {
    setInput((prev) => (prev ? `${prev} @${name}` : `@${name}`))
  }

  async function onSendWithMentions(e: React.FormEvent) {
    e.preventDefault()
    // Support canvas names with spaces by matching full names as typed with '@'
    const mentioned: string[] = listCanvasNames.filter((name) => input.includes(`@${name}`))
    const attachments: { name: string; dataUrl: string }[] = []
    for (const name of mentioned) {
      if (!listCanvasNames.includes(name)) continue
      const blob = await exportCanvas(name)
      if (!blob) continue
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      attachments.push({ name, dataUrl })
    }

    const parts: any[] = [
      ...attachments.map((a) => ({ type: "file" as const, mediaType: "image/png", url: a.dataUrl })),
      { type: "text" as const, text: input },
    ]

    await sendMessage(
      { role: "user", parts },
      {
        headers: useCustom
          ? {
              "x-provider-base-url": baseURL,
              "x-provider-api-key": apiKey,
              "x-provider-model": model,
            }
          : undefined,
      } as any
    )
    setInput("")
  }

  return (
    <div className="h-full flex flex-col bg-white text-neutral-900">
      <div className="p-3 border-b border-neutral-200 flex items-center gap-2">
        <div className="font-semibold">Assistant</div>
        <div className="ml-auto text-xs text-neutral-600">@mention a canvas to attach it</div>
      </div>
      <div className="p-3 border-b border-neutral-200 text-sm flex items-center gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
          <span className="text-neutral-800">Use custom provider</span>
        </label>
        {useCustom && (
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="border border-neutral-300 px-2 py-1 rounded text-xs text-neutral-900 placeholder-neutral-500"
              placeholder="https://api.openai.com/v1"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
            <div className="flex items-center">
              <input
                className="border border-neutral-300 px-2 py-1 rounded-l text-xs text-neutral-900 placeholder-neutral-500"
                placeholder="API Key"
                value={apiKey}
                type={showApiKey ? "text" : "password"}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="border border-l-0 border-neutral-300 px-2 py-1 rounded-r text-xs text-neutral-700 hover:bg-neutral-50"
                title={showApiKey ? "Hide" : "Show"}
                onClick={() => setShowApiKey((v) => !v)}
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            <input
              className="border border-neutral-300 px-2 py-1 rounded text-xs text-neutral-900 placeholder-neutral-500"
              placeholder="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <button
              type="button"
              className="px-2 py-1 rounded bg-neutral-900 text-white text-xs"
              onClick={handleSaveProviderSettings}
            >
              Save
            </button>
            {saveIndicator === "saved" && (
              <div className="text-xs text-green-700">Saved</div>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {messages.map((m: any) => (
          <div key={m.id} className="text-sm text-neutral-900">
            <div className="font-semibold mb-1 text-neutral-800">{m.role}</div>
            <div className="text-sm text-neutral-900 leading-6 whitespace-pre-wrap break-words">
              {m.parts?.map((part: any, i: number) => {
                if (part.type === "text") return <ReactMarkdown key={i}>{part.text}</ReactMarkdown>
                if (part.type === "file" && part.mediaType?.startsWith("image/")) {
                  return <img key={i} src={part.url} alt={part.filename || "image"} className="rounded border" />
                }
                return null
              })}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={onSendWithMentions} className="p-3 border-t border-neutral-200 flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500"
            value={input}
            onChange={(e) => {
              const el = e.target as HTMLInputElement
              const nextVal = el.value
              setInput(nextVal)
              const nextCaret = el.selectionStart ?? nextVal.length
              updateCaretAndMention(nextVal, nextCaret)
            }}
            onKeyDown={(e) => {
              if (!mentionOpen || filteredMentions.length === 0) return
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setHighlightIndex((i) => (i + 1) % filteredMentions.length)
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setHighlightIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length)
              } else if (e.key === "Enter") {
                e.preventDefault()
                applyMention(filteredMentions[Math.max(0, Math.min(highlightIndex, filteredMentions.length - 1))])
              } else if (e.key === "Escape") {
                setMentionOpen(false)
              }
            }}
            onClick={(e) => {
              const el = e.target as HTMLInputElement
              const nextCaret = el.selectionStart ?? 0
              updateCaretAndMention(input, nextCaret)
            }}
            onBlur={() => {
              // Give time for click on menu
              setTimeout(() => setMentionOpen(false), 100)
            }}
            placeholder="Ask anything... Use @CanvasName to attach a canvas"
          />
          {mentionOpen && filteredMentions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 z-20 border border-neutral-200 bg-white rounded shadow-sm max-h-56 overflow-auto">
              {filteredMentions.map((name, idx) => (
                <button
                  type="button"
                  key={name}
                  className={`w-full text-left px-3 py-2 text-sm ${idx === highlightIndex ? "bg-neutral-100" : "bg-white"}`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    applyMention(name)
                  }}
                >
                  @{name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded border border-neutral-300 text-sm"
          onClick={async () => {
            // Attach all canvases by synthesizing mentions
            const allNames = listCanvasNames
            let msg = input
            for (const n of allNames) {
              if (!msg.includes(`@${n}`)) msg += (msg ? " " : "") + `@${n}`
            }
            setInput(msg)
          }}
        >
          Refer all
        </button>
        <button className="px-3 py-2 rounded bg-neutral-900 text-white text-sm" type="submit">
          Send
        </button>
      </form>

      {listCanvasNames.length > 0 && (
        <div className="p-2 border-t border-neutral-200 text-xs flex flex-wrap gap-2">
          {listCanvasNames.map((n) => (
            <button key={n} className="px-2 py-1 rounded border border-neutral-300 text-neutral-800" onClick={() => insertMention(n)}>
              @{n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


