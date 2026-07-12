import { getCurrentUser, json } from "../../_shared/auth.js";

function makeId() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `note_${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const result = await context.env.DB.prepare(
    `SELECT id, body, created_at, updated_at
     FROM private_notes
     WHERE user_id = ?
     ORDER BY datetime(created_at) ASC
     LIMIT 500`
  )
    .bind(user.id)
    .all();

  return json({ ok: true, notes: result.results || [] });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body = {};

  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const text = String(body.body || "").trim();

  if (!text || Array.from(text).length > 4000) {
    return json(
      { ok: false, error: "Note must contain 1 to 4000 characters" },
      { status: 400 }
    );
  }

  const id = makeId();

  await context.env.DB.prepare(
    `INSERT INTO private_notes (id, user_id, body, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(id, user.id, text)
    .run();

  const note = await context.env.DB.prepare(
    `SELECT id, body, created_at, updated_at
     FROM private_notes
     WHERE id = ? AND user_id = ?`
  )
    .bind(id, user.id)
    .first();

  return json({ ok: true, note });
}
