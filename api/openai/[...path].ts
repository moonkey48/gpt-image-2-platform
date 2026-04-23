// Vercel serverless function that proxies /api/openai/* to api.openai.com.
// Runs on Node.js (Fluid Compute). The OpenAI API key stays server-side —
// the client never receives it and never needs to send Authorization.

export const config = { runtime: "nodejs" };

export default async function handler(request: Request): Promise<Response> {
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
  const upstreamPath = url.pathname.replace(/^\/api\/openai/, "");
  if (!upstreamPath || upstreamPath === "/") {
    return Response.json(
      { error: { message: "Missing upstream path." } },
      { status: 400 },
    );
  }
  const upstreamUrl = `https://api.openai.com${upstreamPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${apiKey}`);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return Response.json(
      {
        error: {
          message:
            err instanceof Error
              ? `OpenAI 요청 실패: ${err.message}`
              : "OpenAI 요청에 실패했습니다.",
        },
      },
      { status: 502 },
    );
  }
}
