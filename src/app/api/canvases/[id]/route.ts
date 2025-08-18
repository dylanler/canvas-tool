import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { name, tldrawData } = await req.json()

  const canvas = await prisma.canvas.updateMany({
    where: { 
      id,
      userId: session.user.id 
    },
    data: {
      ...(name && { name }),
      ...(tldrawData && { tldrawData })
    }
  })

  if (canvas.count === 0) {
    return NextResponse.json({ error: "Canvas not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  console.log(`🗑️ DELETE canvas request: ${id} by user ${session.user.id}`)

  // First check if canvas exists and belongs to user
  const existingCanvas = await prisma.canvas.findFirst({
    where: { 
      id,
      userId: session.user.id 
    }
  })

  if (!existingCanvas) {
    console.log(`❌ Canvas not found: ${id}`)
    return NextResponse.json({ error: "Canvas not found" }, { status: 404 })
  }

  const canvas = await prisma.canvas.deleteMany({
    where: { 
      id,
      userId: session.user.id 
    }
  })

  console.log(`✅ Canvas deleted: ${id}, count: ${canvas.count}`)
  return NextResponse.json({ success: true })
}