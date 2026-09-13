import { firstForwardedIp, signClientIp } from "@/convex/lib/clientIp";
import { handler } from "@/lib/auth-server";

// Sign the browser's IP for Convex, so sign-in rate limits apply per visitor rather than to
// this server's address (convex/lib/clientIp.ts). On Vercel, x-real-ip and x-forwarded-for
// are set by the platform and can't be forged by the browser.
async function withClientIp(request: Request) {
  const secret = process.env.AUTH_PROXY_SECRET;
  if (!secret) return request;
  const ip = firstForwardedIp(request.headers.get("x-real-ip"))
    ?? firstForwardedIp(request.headers.get("x-forwarded-for"))
    ?? "127.0.0.1";
  const headers = new Headers(request.headers);
  for (const [name, value] of Object.entries(await signClientIp(ip, secret))) headers.set(name, value);
  return new Request(request, { headers });
}

export async function GET(request: Request) {
  return handler.GET(await withClientIp(request));
}

export async function POST(request: Request) {
  return handler.POST(await withClientIp(request));
}
