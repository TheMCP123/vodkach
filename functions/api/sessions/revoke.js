import { getCurrentUser, json } from "../../_shared/auth.js";

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await readJson(context.request);
  const sessionId = String(body?.session_id || "").trim();

  if (!sessionId) {
    return json({ ok: false, error: "session_id is required" }, { status: 400 });
  }

  if (sessionId === user.current_session_id) {
    return json({ ok: false, error: "Use Sign Out for the current session" }, { status: 400 });
  }

  await context.env.DB.prepare(
    `UPDATE sessions
     SET revoked_at = datetime('now')
     WHERE id = ?
       AND user_id = ?`
  )
    .bind(sessionId, user.id)
    .run();

  return json({ ok: true });
}
