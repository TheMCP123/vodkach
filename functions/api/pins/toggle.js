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

  const messageId = String(body.message_id || "").trim();
  const action = String(body.action || "").trim();

  if (!messageId || !["pin", "unpin"].includes(action)) {
    return json({ ok: false, error: "Invalid pin action" }, { status: 400 });
  }

  const message = await context.env.DB.prepare(
    `SELECT messages.id, messages.chat_id
     FROM messages
     JOIN chat_members
       ON chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = ?
      AND chat_members.left_at IS NULL
     WHERE messages.id = ?
       AND messages.deleted_at IS NULL
     LIMIT 1`
  )
    .bind(user.id, messageId)
    .first();

  if (!message) {
    return json({ ok: false, error: "Message not found" }, { status: 404 });
  }

  if (action === "pin") {
    await context.env.DB.prepare(
      `INSERT INTO pinned_messages (
         chat_id,
         message_id,
         pinned_by_user_id,
         pinned_at
       ) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(chat_id, message_id) DO UPDATE SET
         pinned_by_user_id = excluded.pinned_by_user_id,
         pinned_at = excluded.pinned_at`
    )
      .bind(message.chat_id, message.id, user.id)
      .run();
  } else {
    await context.env.DB.prepare(
      `DELETE FROM pinned_messages
       WHERE chat_id = ?
         AND message_id = ?`
    )
      .bind(message.chat_id, message.id)
      .run();
  }

  return json({ ok: true, action });
}
