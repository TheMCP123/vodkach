import { getCurrentUser, json } from "../../_shared/auth.js";

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

  const noteId = String(body.note_id || "").trim();

  const result = await context.env.DB.prepare(
    `DELETE FROM private_notes
     WHERE id = ?
       AND user_id = ?`
  )
    .bind(noteId, user.id)
    .run();

  return json({
    ok: true,
    changed: result.meta?.changes || 0
  });
}
