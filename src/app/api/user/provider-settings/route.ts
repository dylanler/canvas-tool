import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = await prisma.providerSettings.findUnique({
    where: { userId: session.user.id }
  })

  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { useCustom, baseUrl, apiKey, model } = await req.json()

  const settings = await prisma.providerSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      useCustom,
      baseUrl,
      apiKey,
      model
    },
    update: {
      useCustom,
      baseUrl,
      apiKey,
      model
    }
  })

  return NextResponse.json(settings)
}