import { firstForwardedIp, signClientIp } from "@/convex/lib/clientIp";
import { handler } from "@/lib/auth-server";

// Next hands route handlers a Proxy around the request so it can track dynamic access. Native
// Request methods read private fields (`#state`, in the undici that ships with Node 24), and a
// Proxy can't forward those, so anything that treats it as a real Request throws "Cannot read
// private member #state from an object whose class did not declare it". Reading properties off
// the proxy is safe, so rebuild a plain Request from them before passing it on.
function unproxied(request: Request, headers: Headers) {
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // Node requires this whenever the body is a stream.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

// Sign the browser's IP for Convex, so sign-in rate limits apply per visitor rather than to
// this server's address (convex/lib/clientIp.ts). On Vercel, x-real-ip and x-forwarded-for
// are set by the platform and can't be forged by the browser.
async function withClientIp(request: Request) {
  const headers = new Headers(request.headers);
  const secret = process.env.AUTH_PROXY_SECRET;
  if (secret) {
    const ip = firstForwardedIp(request.headers.get("x-real-ip"))
      ?? firstForwardedIp(request.headers.get("x-forwarded-for"))
      ?? "127.0.0.1";
    for (const [name, value] of Object.entries(await signClientIp(ip, secret))) headers.set(name, value);
  }
  return unproxied(request, headers);
}

export async function GET(request: Request) {
  return handler.GET(await withClientIp(request));
}

export async function POST(request: Request) {
  return handler.POST(await withClientIp(request));
}
