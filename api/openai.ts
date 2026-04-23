// Vercel serverless function that proxies all /api/openai/* requests to
// api.openai.com. Routed here via vercel.json rewrites. The OpenAI API key
// stays on the server — the client never receives or sends it.
//
// Uses the legacy Node.js (req, res) signature because Vercel's current
// "nodejs" runtime on CLI 51.6.x ignores Web-standard Response returns,
// which caused the previous Web Handler version to hang (the response was
// never emitted via res.end()).

import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      sendJson(res, 500, {
        error: {
          message:
            "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. Vercel 환경 변수를 확인해주세요.",
        },
      });
      return;
    }

    // req.url is path + query only in IncomingMessage (not absolute).
    const rawUrl = req.url || "";
    const [rawPath, rawQuery = ""] = rawUrl.split("?");
    const upstreamPath = rawPath.replace(/^\/api\/openai/, "") || "/";
    if (upstreamPath === "/") {
      sendJson(res, 400, {
        error: { message: `Missing upstream path (got ${rawPath}).` },
      });
      return;
    }
    const upstreamUrl =
      `https://api.openai.com${upstreamPath}` +
      (rawQuery ? `?${rawQuery}` : "");

    // Forward request headers, stripping hop-by-hop and any incoming auth.
    const forwardHeaders: Record<string, string> = {};
    for (const [rawKey, rawValue] of Object.entries(req.headers)) {
      if (rawValue === undefined) continue;
      const lower = rawKey.toLowerCase();
      if (
        lower === "host" ||
        lower === "connection" ||
        lower === "content-length" ||
        lower === "authorization"
      ) {
        continue;
      }
      forwardHeaders[lower] = Array.isArray(rawValue)
        ? rawValue.join(", ")
        : rawValue;
    }
    forwardHeaders["authorization"] = `Bearer ${apiKey}`;

    // Buffer the request body — preserves multipart binary data verbatim.
    // ArrayBuffer is the portable BodyInit shape across DOM and Node types.
    let body: ArrayBuffer | undefined;
    if (req.method && req.method !== "GET" && req.method !== "HEAD") {
      const buf = await readBody(req);
      body = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ) as ArrayBuffer;
    }

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const responseBuffer = Buffer.from(await upstream.arrayBuffer());

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "content-encoding" || lower === "transfer-encoding") return;
      if (lower === "content-length") return; // we set our own below
      res.setHeader(key, value);
    });
    res.setHeader("content-length", String(responseBuffer.length));
    res.end(responseBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    if (!res.headersSent) {
      sendJson(res, 500, {
        error: { message: `Proxy error: ${message}`, stack },
      });
    } else {
      try {
        res.end();
      } catch {
        // swallow
      }
    }
  }
}
