import { handleAuthRequest, HttpError } from "./auth";

function jsonError(status: number, code: string, message: string, origin?: string): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers });
}

function corsOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get("Origin");
  if (!origin) return undefined;
  const allowed = env.CORS_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : undefined;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = corsOrigin(request, env);
    if (request.headers.has("Origin") && !origin) {
      return jsonError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed.");
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin ?? "null",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "600",
          Vary: "Origin",
        },
      });
    }

    try {
      const response = await handleAuthRequest(request, env);
      if (!origin) return response;
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (error instanceof HttpError) return jsonError(error.status, error.code, error.message, origin);
      console.error("Unhandled auth request error", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown exception");
      return jsonError(500, "INTERNAL_ERROR", "An unexpected error occurred.", origin);
    }
  },
} satisfies ExportedHandler<Env>;