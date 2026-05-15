import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const PUBLIC_PATHS = ["/api", "/_next/static", "/_next/image", "/favicon.ico", "/icon", "/apple-icon"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static/public assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Validate session cookie
  const cookie = req.cookies.get("jeans_session")?.value;

  if (cookie) {
    try {
      const payload = await decrypt(cookie);
      // Session is valid — attach orgId header for downstream use
      const response = NextResponse.next();
      response.headers.set("x-org-id", String(payload.orgId || ""));
      return response;
    } catch {
      // Invalid/expired session — let the client-side auth handle redirect
      return NextResponse.next();
    }
  }

  // No session cookie — let the client-side AuthProvider handle the login gate
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
