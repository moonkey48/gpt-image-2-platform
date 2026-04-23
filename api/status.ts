// Returns whether the server has OPENAI_API_KEY configured. The key value
// itself is never sent to the client.

export default async function handler(): Promise<Response> {
  return Response.json(
    { configured: !!process.env.OPENAI_API_KEY },
    { headers: { "cache-control": "no-store" } },
  );
}
