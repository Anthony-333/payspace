import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { createAuth } from "./auth";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_SIG_HEADER,
  CLIENT_IP_TS_HEADER,
  TRUSTED_IP_HEADER,
  firstForwardedIp,
  verifyClientIp,
} from "./lib/clientIp";

const http = httpRouter();

// The auth routes are registered here rather than with authComponent.registerRoutes, so each
// request's client IP can be settled before Better Auth's rate limiter reads it (convex/lib/clientIp.ts).
const AUTH_PATH = "/api/auth";

async function normalizeAuthRequest(request: Request) {
  const headers = new Headers(request.headers);
  // Same as the component: Convex overwrites x-forwarded-host/proto, so the proxy sends copies.
  const host = headers.get("x-better-auth-forwarded-host");
  const proto = headers.get("x-better-auth-forwarded-proto");
  if (host) headers.set("x-forwarded-host", host);
  if (proto) headers.set("x-forwarded-proto", proto);

  const signed = await verifyClientIp(headers, process.env.AUTH_PROXY_SECRET);
  // Without a valid signature, fall back to the address that called Convex, which can't be spoofed.
  const ip = signed ?? firstForwardedIp(headers.get("cf-connecting-ip")) ?? firstForwardedIp(headers.get("x-forwarded-for"));
  for (const name of [CLIENT_IP_HEADER, CLIENT_IP_TS_HEADER, CLIENT_IP_SIG_HEADER, TRUSTED_IP_HEADER]) headers.delete(name);
  if (ip) headers.set(TRUSTED_IP_HEADER, ip);
  return new Request(request, { headers });
}

const authHandler = httpAction(async (ctx, request) => createAuth(ctx).handler(await normalizeAuthRequest(request)));

http.route({ pathPrefix: `${AUTH_PATH}/`, method: "GET", handler: authHandler });
http.route({ pathPrefix: `${AUTH_PATH}/`, method: "POST", handler: authHandler });
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () =>
    Response.redirect(`${process.env.CONVEX_SITE_URL}${AUTH_PATH}/convex/.well-known/openid-configuration`)),
});

export default http;
