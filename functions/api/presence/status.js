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
  const status = String(body?.status || "").toLowerCase();
  const allowed = new Set(["online", "offline", "sleeping", "dnd"]);

  if (!allowed.has(status)) {
    return json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  await context.env.DB.prepare(
    `UPDATE users
     SET status_preference = ?,
         last_seen_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(status, user.id)
    .run();

  return json({
    ok: true,
    status_preference: status,
    effective_status: status === "offline" ? "offline" : status
  });
}
