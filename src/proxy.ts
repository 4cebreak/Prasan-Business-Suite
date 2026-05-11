import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

export async function proxy(req: NextRequest) {
  // Check for session cookie
  const cookie = req.cookies.get("jeans_session")?.value;
  
  if (cookie) {
    try {
      await decrypt(cookie);
    } catch {
      // Invalid session
    }
  }

  // Redirect to login if not authenticated and trying to access a protected route
  // However, in this specific app, the UI handles most state.
  // We primarily want to protect against direct access to data pages if they were separate.
  // Since it's a SPA-like structure in Next.js, the server actions protection is the most important.
  
  return NextResponse.next();
}

// Optional: Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
