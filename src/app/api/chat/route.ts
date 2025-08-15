import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"

export const maxDuration = 60

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({ messages: [] }))
  const messages: UIMessage[] = body.messages || []

  // Support overrides via headers for client-provided OpenAI compatible servers
  const baseURL = req.headers.get("x-provider-base-url") || undefined
  const apiKey = req.headers.get("x-provider-api-key") || process.env.OPENAI_API_KEY
  const modelName = req.headers.get("x-provider-model") || process.env.OPENAI_MODEL || "gpt-5-mini"

  const configured = baseURL
    ? createOpenAI({ baseURL, apiKey: apiKey || undefined })(modelName)
    : openai(modelName)

  const result = streamText({
    model: configured,
    messages: convertToModelMessages(messages),
    // If attachments with data URLs were sent, include brief context
    system: "You are a helpful assistant analyzing canvases. When images are present, describe insights succinctly.",
  })

  return result.toUIMessageStreamResponse()
}


