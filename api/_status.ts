// Returns whether the server has an OpenAI API key configured.
// Only reports a boolean — the key itself is never sent to the client.

export const config = { runtime: "nodejs" };

export default async function handler(): Promise<Response> {
  return Response.json(
    { configured: !!process.env.OPENAI_API_KEY },
    { headers: { "cache-control": "no-store" } },
  );
}
