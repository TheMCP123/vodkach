import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const rawSession = context.request.headers.get("Cookie") || "";

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE users
       SET last_seen_at = datetime('now')
       WHERE id = ?`
    ).bind(user.id),

    context.env.DB.prepare(
      `UPDATE sessions
       SET last_seen_at = datetime('now')
       WHERE id = ?`
    ).bind(user.current_session_id)
  ]);

  const effectiveStatus =
    user.status_preference === "offline"
      ? "offline"
      : user.status_preference || "online";

  return json({
    ok: true,
    last_seen_at: new Date().toISOString(),
    effective_status: effectiveStatus
  });
}
