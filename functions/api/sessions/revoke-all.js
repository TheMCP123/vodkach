import { getCurrentUser, json } from "../../_shared/auth.js";

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await readJson(context.request);
  const keepCurrent = body.keep_current !== false;

  if (keepCurrent) {
    await context.env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ?
         AND id != ?
         AND revoked_at IS NULL`
    )
      .bind(user.id, user.current_session_id)
      .run();
  } else {
    await context.env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ?
         AND revoked_at IS NULL`
    )
      .bind(user.id)
      .run();
  }

  return json({ ok: true });
}
