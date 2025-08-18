import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const canvases = await prisma.canvas.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" }
  })

  return NextResponse.json(canvases)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, persistenceKey } = await req.json()

  const canvas = await prisma.canvas.create({
    data: {
      name,
      persistenceKey,
      userId: session.user.id
    }
  })

  return NextResponse.json(canvas)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Delete all canvases for the user
  await prisma.canvas.deleteMany({
    where: { userId: session.user.id }
  })

  return NextResponse.json({ success: true })
}