import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"

export const maxDuration = 60

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({ messages: [] }))
  const messages: UIMessage[] = body.messages || []

  // Support overrides via headers for client-provided OpenAI compatible servers
  const headerBaseURL = req.headers.get("x-provider-base-url") || undefined
  const headerApiKey = req.headers.get("x-provider-api-key") || undefined
  const modelName =
    req.headers.get("x-provider-model") ||
    process.env.OPENAI_MODEL ||
    "gpt-5-mini"

  // Read environment-based overrides for OpenAI-compatible endpoints
  const envBaseURL = process.env.OPENAI_BASE_URL || undefined
  const envApiKey = process.env.OPENAI_API_KEY || undefined

  // If either a custom API key or base URL is supplied, use a custom OpenAI client.
  // This ensures users can just provide an API key for the default OpenAI endpoint.
  const configured = (() => {
    // Prefer header overrides when present
    if (headerApiKey || headerBaseURL) {
      const provider = createOpenAI({ baseURL: headerBaseURL, apiKey: headerApiKey })
      return provider.chat(modelName)
    }
    // Otherwise use env-based OpenAI-compatible endpoint when provided
    if (envBaseURL) {
      const provider = createOpenAI({ baseURL: envBaseURL, apiKey: envApiKey })
      return provider.chat(modelName)
    }
    // Fall back to default OpenAI provider
    return openai.chat(modelName)
  })()

  const result = streamText({
    model: configured,
    messages: convertToModelMessages(messages),
    // If attachments with data URLs were sent, include brief context
    system: "You are a helpful assistant analyzing canvases. When images are present, describe insights succinctly.",
  })

  return result.toUIMessageStreamResponse()
}


