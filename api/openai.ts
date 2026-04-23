// Vercel serverless function that proxies all /api/openai/* requests to
// api.openai.com. Routed here via vercel.json rewrites. The OpenAI API key
// stays on the server — the client never receives or sends it.

export default async function handler(request: Request): Promise<Response> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: {
            message:
              "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. Vercel 환경 변수를 확인해주세요.",
          },
        },
        { status: 500 },
      );
    }

    const url = new URL(request.url);
    const upstreamPath = url.pathname.replace(/^\/api\/openai/, "") || "/";
    if (upstreamPath === "/") {
      return Response.json(
        {
          error: {
            message: `Missing upstream path (got ${url.pathname}).`,
          },
        },
        { status: 400 },
      );
    }
    const upstreamUrl = `https://api.openai.com${upstreamPath}${url.search}`;

    // Copy request headers, excluding hop-by-hop and auth (we override auth).
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      const lower = key.toLowerCase();
      if (
        lower === "host" ||
        lower === "connection" ||
        lower === "content-length" ||
        lower === "authorization"
      ) {
        continue;
      }
      headers.set(key, value);
    }
    headers.set("authorization", `Bearer ${apiKey}`);

    // Buffer the body instead of streaming — avoids the `duplex: 'half'`
    // requirement that some runtimes don't support. Preserves binary data
    // (multipart uploads) verbatim via ArrayBuffer.
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
    });

    // Buffer the response as bytes too, so we can recompute Content-Length
    // and avoid transfer-encoding mismatches through the Vercel edge.
    const responseBody = await upstream.arrayBuffer();
    const respHeaders = new Headers(upstream.headers);
    respHeaders.delete("content-encoding");
    respHeaders.delete("transfer-encoding");
    respHeaders.set("content-length", String(responseBody.byteLength));

    return new Response(responseBody, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return Response.json(
      {
        error: {
          message: `Proxy error: ${message}`,
          stack,
        },
      },
      { status: 500 },
    );
  }
}
