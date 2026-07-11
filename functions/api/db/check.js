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

  const requiredTables = [
    "users",
    "devices",
    "sessions",
    "schema_meta",
    "chats",
    "chat_members",
    "direct_chats",
    "messages",
    "friend_requests",
    "friendships"
  ];

  const requiredUserColumns = [
    "access_status",
    "requested_at",
    "approved_at",
    "approved_by",
    "rejected_at",
    "disabled_at"
  ];

  const rows = await context.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  ).all();

  const tables = rows.results.map((row) => row.name);
  const missingTables = requiredTables.filter((table) => !tables.includes(table));

  const userColumnsRows = await context.env.DB.prepare("PRAGMA table_info(users)").all();
  const userColumns = userColumnsRows.results.map((row) => row.name);
  const missingUserColumns = requiredUserColumns.filter((column) => !userColumns.includes(column));

  const schemaVersion = await context.env.DB.prepare(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
  ).first();

  return Response.json(
    {
      ok: missingTables.length === 0 && missingUserColumns.length === 0,
      database: "connected",
      schema_version: schemaVersion?.value ?? null,
      required_tables: requiredTables,
      existing_tables: tables,
      missing_tables: missingTables,
      required_user_columns: requiredUserColumns,
      missing_user_columns: missingUserColumns
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}
