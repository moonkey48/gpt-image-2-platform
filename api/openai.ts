// Vercel serverless function that proxies all /api/openai/* requests to
// api.openai.com. Routed here via vercel.json rewrites. The OpenAI API key
// stays on the server — the client never receives or sends it.

export const config = {
  runtime: "nodejs22.x",
  maxDuration: 300,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        {
          error: {
            message:
              "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. Vercel 환경 변수를 확인해주세요.",
          },
        },
        500,
      );
    }

    // request.url is a full absolute URL on Vercel's web handler runtime.
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return jsonResponse(
        { error: { message: `Invalid request.url: ${String(request.url)}` } },
        400,
      );
    }

    const upstreamPath = url.pathname.replace(/^\/api\/openai/, "");
    if (!upstreamPath || upstreamPath === "/") {
      return jsonResponse(
        { error: { message: `Missing upstream path (got ${url.pathname}).` } },
        400,
      );
    }
    const upstreamUrl = `https://api.openai.com${upstreamPath}${url.search}`;

    // Copy request headers, excluding hop-by-hop and any incoming auth.
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "host" ||
        lower === "connection" ||
        lower === "content-length" ||
        lower === "authorization"
      ) {
        return;
      }
      headers.set(key, value);
    });
    headers.set("authorization", `Bearer ${apiKey}`);

    // Buffer body (avoids duplex streaming requirement) and preserves
    // multipart binary data exactly.
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
    });

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
    return jsonResponse(
      { error: { message: `Proxy error: ${message}`, stack } },
      500,
    );
  }
}
