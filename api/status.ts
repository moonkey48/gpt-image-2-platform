// Returns whether the server has OPENAI_API_KEY configured. The key value
// itself is never sent to the client.
//
// Uses the legacy Node.js (req, res) signature to match Vercel's "nodejs"
// runtime behavior, which ignores Web-standard Response return values.

import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  runtime: "nodejs",
};

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(
    JSON.stringify({ configured: !!process.env.OPENAI_API_KEY }),
  );
}
