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
  const messageId = String(body?.message_id || "").trim();

  if (!messageId) {
    return json({ ok: false, error: "message_id is required" }, { status: 400 });
  }

  const message = await context.env.DB.prepare(
    `SELECT messages.id
     FROM messages
     JOIN chat_members
       ON chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = ?
      AND chat_members.left_at IS NULL
     WHERE messages.id = ?
     LIMIT 1`
  )
    .bind(user.id, messageId)
    .first();

  if (!message) {
    return json({ ok: false, error: "Message not found" }, { status: 404 });
  }

  await context.env.DB.prepare(
    `DELETE FROM messages
     WHERE id = ?`
  )
    .bind(messageId)
    .run();

  return json({ ok: true, message_id: messageId });
}
