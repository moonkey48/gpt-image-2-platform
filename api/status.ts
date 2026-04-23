// Returns whether the server has OPENAI_API_KEY configured. The key value
// itself is never sent to the client.

export const config = {
  runtime: "nodejs22.x",
};

export default async function handler(): Promise<Response> {
  const body = JSON.stringify({
    configured: !!process.env.OPENAI_API_KEY,
  });
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
