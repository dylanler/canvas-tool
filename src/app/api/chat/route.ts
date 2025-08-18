import { streamText, type UIMessage } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export const maxDuration = 60

export async function POST(req: Request) {
  console.log("🚀 CHAT API CALLED - NEW VERSION")
  
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json().catch(() => ({ messages: [], chatSessionId: null }))
  console.log("📦 REQUEST BODY:", JSON.stringify(body, null, 2))
  
  const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : []
  const chatSessionId = body.chatSessionId
  const attachments = body.attachments || []
  
  console.log("📝 PROCESSED MESSAGES:", messages)
  console.log("📝 MESSAGES IS ARRAY:", Array.isArray(messages))
  console.log("📎 ATTACHMENTS:", attachments)

  // Save messages to database if chatSessionId provided
  if (chatSessionId && messages.length > 0) {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === "user") {
      const messageContent = (lastMessage as any).parts || [{ type: "text", text: (lastMessage as any).content || "" }]
      await prisma.chatMessage.create({
        data: {
          chatSessionId,
          role: lastMessage.role,
          content: JSON.parse(JSON.stringify(messageContent))
        }
      })
    }
  }

  // Get user's provider settings
  const providerSettings = await prisma.providerSettings.findUnique({
    where: { userId: session.user.id }
  })

  // Support overrides via headers for client-provided OpenAI compatible servers
  const headerBaseURL = req.headers.get("x-provider-base-url") || undefined
  const headerApiKey = req.headers.get("x-provider-api-key") || undefined
  const modelName =
    req.headers.get("x-provider-model") ||
    providerSettings?.model ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini"

  // Read environment-based overrides for OpenAI-compatible endpoints
  const envBaseURL = process.env.OPENAI_BASE_URL || undefined
  const envApiKey = process.env.OPENAI_API_KEY || undefined

  // Use user's provider settings if available
  const userBaseURL = providerSettings?.useCustom ? (providerSettings.baseUrl || undefined) : undefined
  const userApiKey = providerSettings?.useCustom ? (providerSettings.apiKey || undefined) : undefined

  // If either a custom API key or base URL is supplied, use a custom OpenAI client.
  // This ensures users can just provide an API key for the default OpenAI endpoint.
  const configured = (() => {
    // Prefer header overrides when present
    if (headerApiKey || headerBaseURL) {
      const provider = createOpenAI({ baseURL: headerBaseURL, apiKey: headerApiKey })
      return provider.chat(modelName)
    }
    // Use user's saved provider settings
    if (userApiKey || userBaseURL) {
      const provider = createOpenAI({ baseURL: userBaseURL, apiKey: userApiKey })
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

  // Debug: Log messages structure
  console.log("Messages received:", JSON.stringify(messages, null, 2))
  console.log("Messages type:", typeof messages, "isArray:", Array.isArray(messages))
  
  // Ensure messages is a valid array
  const validMessages = Array.isArray(messages) ? messages : []
  console.log("Valid messages count:", validMessages.length)
  
  // Pass messages directly to streamText (no conversion needed with useChat)
  let result
  try {
    console.log("🔄 Calling streamText with:", { 
      messagesLength: validMessages.length, 
      firstMessage: validMessages[0] 
    })
    
    // Convert to proper format for streamText
    const modelMessages = validMessages.map((msg, index) => {
      let content = ''
      
      // Handle messages with content string
      if (typeof msg.content === 'string') {
        content = msg.content
      }
      // Handle messages with parts array (assistant messages)
      else if (Array.isArray((msg as any).parts)) {
        const textParts = (msg as any).parts.filter((part: any) => part.type === 'text')
        content = textParts.map((part: any) => part.text).join('')
      }
      
      // For the last user message, include attachments as images with canvas names
      if (msg.role === 'user' && index === validMessages.length - 1 && attachments.length > 0) {
        const imageContent = attachments.map((attachment: any) => ({
          type: 'image' as const,
          image: attachment.url
        }))
        
        // Add canvas name context before each image
        const contentWithContext = []
        for (const attachment of attachments) {
          contentWithContext.push({
            type: 'text' as const,
            text: `Canvas: "${attachment.name || 'Unnamed Canvas'}"`
          })
          contentWithContext.push({
            type: 'image' as const,
            image: attachment.url
          })
        }
        
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: [
            ...contentWithContext,
            {
              type: 'text' as const,
              text: content
            }
          ]
        }
      }
      
      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: content || ''
      }
    }).filter(msg => {
      const hasContent = Array.isArray(msg.content) ? 
        msg.content.some((part: any) => part.type === 'text' && part.text.trim()) :
        msg.content.trim() !== ''
      return hasContent
    })
    
    result = streamText({
      model: configured,
      messages: modelMessages,
      // If attachments with data URLs were sent, include brief context
      system: "You are a helpful assistant analyzing tldraw canvases. When canvas images are provided, each image will be preceded by its canvas name (e.g., 'Canvas: \"Canvas 1\"'). Reference canvases by their specific names when discussing them. Provide insights about the drawings, diagrams, or content in each canvas.",
      onFinish: async (response) => {
        // Save assistant response to database if chatSessionId provided
        if (chatSessionId && response.text) {
          await prisma.chatMessage.create({
            data: {
              chatSessionId,
              role: "assistant",
              content: [{ type: "text", text: response.text }]
            }
          })
        }
      }
    })
    console.log("✅ streamText created successfully")
  } catch (error) {
    console.error("❌ streamText error:", error)
    return new Response("Chat processing failed", { status: 500 })
  }

  return result.toUIMessageStreamResponse()
}


