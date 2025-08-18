import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const messages = await prisma.chatMessage.findMany({
    where: { 
      chatSessionId: id,
      chatSession: { userId: session.user.id }
    },
    orderBy: { createdAt: "asc" }
  })

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { role, content } = await req.json()

  // Verify the chat session belongs to the user
  const chatSession = await prisma.chatSession.findFirst({
    where: { 
      id,
      userId: session.user.id 
    }
  })

  if (!chatSession) {
    return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatSessionId: id,
      role,
      content
    }
  })

  return NextResponse.json(message)
}