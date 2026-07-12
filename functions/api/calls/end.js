
import { getCurrentUser, json } from "../../_shared/auth.js";
import { readJson } from "../../_shared/calls.js";

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await readJson(context.request);
  const callId = String(body?.call_id || "").trim();

  if (!callId) {
    return json({ ok: false, error: "call_id is required" }, { status: 400 });
  }

  const result = await context.env.DB.prepare(
    `UPDATE calls
     SET status = 'ended',
         ended_at = datetime('now')
     WHERE id = ?
       AND (caller_user_id = ? OR callee_user_id = ?)
       AND status IN ('ringing', 'active')`
  )
    .bind(callId, user.id, user.id)
    .run();

  return json({ ok: true, changed: result.meta?.changes || 0 });
}
