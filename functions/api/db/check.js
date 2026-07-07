export async function onRequestGet(context) {
  if (!context.env.DB) {
    return Response.json(
      {
        ok: false,
        error: "D1 binding DB is not configured"
      },
      { status: 500 }
    );
  }

  const requiredTables = ["users", "devices", "sessions", "schema_meta"];

  const rows = await context.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  ).all();

  const tables = rows.results.map((row) => row.name);
  const missing = requiredTables.filter((table) => !tables.includes(table));

  const schemaVersion = await context.env.DB.prepare(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
  ).first();

  return Response.json(
    {
      ok: missing.length === 0,
      database: "connected",
      schema_version: schemaVersion?.value ?? null,
      required_tables: requiredTables,
      existing_tables: tables,
      missing_tables: missing
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
