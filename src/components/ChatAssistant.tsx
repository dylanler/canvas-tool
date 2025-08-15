"use client"
import { useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"

type Props = {
  listCanvasNames: string[]
  exportCanvas: (name: string) => Promise<Blob | null>
}

export function ChatAssistant({ listCanvasNames, exportCanvas }: Props) {
  const [useCustom, setUseCustom] = useState<boolean>(false)
  const [baseURL, setBaseURL] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [model, setModel] = useState<string>("gpt-4o-mini")

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

  const { messages, sendMessage } = useChat({})
  const [input, setInput] = useState("")

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
            <input className="border border-neutral-300 px-2 py-1 rounded text-xs text-neutral-900 placeholder-neutral-500" placeholder="Base URL" value={baseURL} onChange={(e) => setBaseURL(e.target.value)} />
            <input className="border border-neutral-300 px-2 py-1 rounded text-xs text-neutral-900 placeholder-neutral-500" placeholder="API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <input className="border border-neutral-300 px-2 py-1 rounded text-xs text-neutral-900 placeholder-neutral-500" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {messages.map((m: any) => (
          <div key={m.id} className="text-sm text-neutral-900">
            <div className="font-semibold mb-1 text-neutral-800">{m.role}</div>
            <div>
              {m.parts?.map((part: any, i: number) => {
                if (part.type === "text") return <span key={i} className="text-neutral-900">{part.text}</span>
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
        <input
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything... Use @CanvasName to attach a canvas"
        />
        <button className="px-3 py-2 rounded bg-neutral-900 text-white text-sm">
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


