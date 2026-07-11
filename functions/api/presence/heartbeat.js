import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  await context.env.DB.prepare(
    `UPDATE users
     SET last_seen_at = datetime('now')
     WHERE id = ?`
  )
    .bind(user.id)
    .run();

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
