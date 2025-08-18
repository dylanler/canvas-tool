import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect API routes except auth
        if (req.nextUrl.pathname.startsWith("/api/") && !req.nextUrl.pathname.startsWith("/api/auth/")) {
          return !!token
        }
        
        // Protect main app pages
        if (req.nextUrl.pathname === "/") {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/", "/api/canvases/:path*", "/api/chat-sessions/:path*", "/api/chat", "/api/user/:path*"]
}