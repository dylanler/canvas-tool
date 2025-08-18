"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading
    if (!session) {
      router.push("/auth/signin")
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to sign in
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-neutral-200 bg-white">
        <div className="text-sm text-neutral-600">
          Welcome, {session.user?.name || session.user?.email}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
        >
          Sign Out
        </button>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}