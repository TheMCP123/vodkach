export async function onRequestGet(context) {
  const startedAt = Date.now();

  let database = {
    configured: false,
    ok: false,
    error: null
  };

  if (context.env.DB) {
    database.configured = true;

    try {
      const result = await context.env.DB.prepare(
        "SELECT datetime('now') AS now"
      ).first();

      database.ok = true;
      database.now = result?.now ?? null;
    } catch (error) {
      database.ok = false;
      database.error = "D1 query failed";
    }
  }

  return Response.json(
    {
      ok: true,
      service: "vodkach-api",
      environment: "cloudflare-pages",
      database,
      latency_ms: Date.now() - startedAt
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
