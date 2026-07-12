import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const chatId = String(url.searchParams.get("chat_id") || "").trim();

  const membership = await context.env.DB.prepare(
    `SELECT 1 AS ok
     FROM chat_members
     WHERE chat_id = ?
       AND user_id = ?
       AND left_at IS NULL
     LIMIT 1`
  )
    .bind(chatId, user.id)
    .first();

  if (!membership) {
    return json({ ok: false, error: "Chat not found" }, { status: 404 });
  }

  const result = await context.env.DB.prepare(
    `SELECT
       messages.id,
       messages.chat_id,
       messages.sender_user_id,
       messages.body_ciphertext,
       messages.created_at,
       messages.edited_at,
       users.id AS sender_id,
       users.username AS sender_username,
       users.display_name AS sender_display_name,
       users.avatar_url AS sender_avatar_url,
       users.verified AS sender_verified,
       pinned_messages.pinned_at
     FROM pinned_messages
     JOIN messages ON messages.id = pinned_messages.message_id
     JOIN users ON users.id = messages.sender_user_id
     WHERE pinned_messages.chat_id = ?
       AND messages.deleted_at IS NULL
     ORDER BY datetime(pinned_messages.pinned_at) DESC
     LIMIT 100`
  )
    .bind(chatId)
    .all();

  const messages = (result.results || []).map((row) => ({
    id: row.id,
    chat_id: row.chat_id,
    sender_user_id: row.sender_user_id,
    body_ciphertext: row.body_ciphertext,
    created_at: row.created_at,
    edited_at: row.edited_at,
    pinned_at: row.pinned_at,
    sender: {
      id: row.sender_id,
      username: row.sender_username,
      display_name: row.sender_display_name,
      avatar_url: row.sender_avatar_url,
      verified: Boolean(row.sender_verified)
    }
  }));

  return json({ ok: true, messages });
}
