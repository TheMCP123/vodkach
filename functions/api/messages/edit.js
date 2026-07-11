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
  const ciphertext = String(body?.body_ciphertext || "").trim();

  if (!messageId || !ciphertext || Array.from(ciphertext).length > 1000) {
    return json(
      { ok: false, error: "Message must contain between 1 and 1000 characters" },
      { status: 400 }
    );
  }

  const message = await context.env.DB.prepare(
    `SELECT messages.id, messages.chat_id, messages.sender_user_id
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

  if (message.sender_user_id !== user.id) {
    return json(
      { ok: false, error: "You can only edit your own messages" },
      { status: 403 }
    );
  }

  await context.env.DB.prepare(
    `UPDATE messages
     SET body_ciphertext = ?,
         edited_at = datetime('now')
     WHERE id = ?`
  )
    .bind(ciphertext, messageId)
    .run();

  const updated = await context.env.DB.prepare(
    `SELECT id, body_ciphertext, edited_at
     FROM messages
     WHERE id = ?`
  )
    .bind(messageId)
    .first();

  return json({ ok: true, message: updated });
}
