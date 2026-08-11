import { getCurrentUser, json } from "../../_shared/auth.js";
import { makeId, readJson, requireApprovedUser } from "../../_shared/account.js";

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  const denied = requireApprovedUser(user);
  if (denied) return denied;

  const payload = await readJson(context.request);
  const threadId = String(payload?.thread_id || "").trim();
  const body = String(payload?.body || "").replace(/\r\n?/g, "\n").trim();

  if (!threadId) return json({ ok: false, error: "Missing thread id" }, { status: 400 });
  if (body.length < 1 || body.length > 8000) {
    return json({ ok: false, error: "Reply must be 1-8000 characters" }, { status: 400 });
  }

  const thread = await context.env.DB.prepare(
    `SELECT id, is_locked FROM forum_threads WHERE id = ? LIMIT 1`
  ).bind(threadId).first();
  if (!thread) return json({ ok: false, error: "Thread not found" }, { status: 404 });
  if (thread.is_locked) return json({ ok: false, error: "Thread is locked" }, { status: 409 });

  const id = makeId("reply");
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO forum_replies (id, thread_id, author_user_id, body)
       VALUES (?, ?, ?, ?)`
    ).bind(id, threadId, user.id, body),
    context.env.DB.prepare(
      `UPDATE forum_threads
       SET last_activity_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(threadId)
  ]);

  return json({
    ok: true,
    reply: {
      id,
      thread_id: threadId,
      body,
      created_at: new Date().toISOString(),
      author: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        verified: Boolean(user.verified)
      }
    }
  }, { status: 201 });
}
