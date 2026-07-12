
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
  const pollId = String(body?.poll_id || "").trim();

  const result = await context.env.DB.prepare(
    `UPDATE chat_polls
     SET closed_at = datetime('now')
     WHERE id = ?
       AND creator_user_id = ?
       AND closed_at IS NULL`
  )
    .bind(pollId, user.id)
    .run();

  if (!(result.meta?.changes || 0)) {
    return json(
      { ok: false, error: "Poll not found or already closed" },
      { status: 404 }
    );
  }

  return json({ ok: true });
}
