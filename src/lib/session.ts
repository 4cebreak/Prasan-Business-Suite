import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "jeans-erp-super-secret-key-change-this-in-prod";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: SESSION_SECRET environment variable is required in production. Set it in your .env file.");
}
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function login(orgId: string) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ orgId, expires });

  const cookieStore = await cookies();
  cookieStore.set("jeans_session", session, { 
    expires, 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set("jeans_session", "", { expires: new Date(0) });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("jeans_session")?.value;
  if (!session) return null;
  try {
    return await decrypt(session);
  } catch {
    return null;
  }
}

export async function validateSession() {
  const session = await getSession();
  if (!session) return null;
  
  // Optional: check if org still exists
  return {
    isAuthenticated: true,
    orgId: session.orgId as string
  };
}

export async function verifySession(orgId?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized: No session found");
  
  if (orgId && session.orgId !== orgId) {
    throw new Error("Unauthorized: Organization mismatch");
  }
  
  return session;
}
