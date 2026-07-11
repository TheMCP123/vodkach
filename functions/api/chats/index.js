import { getCurrentUser, json } from "../../_shared/auth.js";
import { requireApprovedUser } from "../../_shared/account.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json(
      {
        ok: false,
        error: "Not authenticated"
      },
      { status: 401 }
    );
  }

  const approvalResponse = requireApprovedUser(user);
  if (approvalResponse) return approvalResponse;

  const rows = await context.env.DB.prepare(
    `SELECT
      chats.id,
      chats.type,
      chats.title,
      chats.avatar_url,
      chats.created_at,
      chats.updated_at,
      chats.last_message_at,
      other_users.id AS other_user_id,
      other_users.username AS other_username,
      other_users.display_name AS other_display_name,
      other_users.avatar_url AS other_avatar_url,
      other_users.verified AS other_verified,
      other_users.created_at AS other_created_at,
      latest_messages.id AS latest_message_id,
      latest_messages.sender_user_id AS latest_sender_user_id,
      latest_messages.created_at AS latest_message_created_at
    FROM chat_members my_membership
    JOIN chats ON chats.id = my_membership.chat_id
    LEFT JOIN direct_chats ON direct_chats.chat_id = chats.id
    LEFT JOIN users other_users
      ON chats.type = 'direct'
      AND other_users.id = CASE
        WHEN direct_chats.user_a_id = ? THEN direct_chats.user_b_id
        ELSE direct_chats.user_a_id
      END
    LEFT JOIN messages latest_messages
      ON latest_messages.id = (
        SELECT id
        FROM messages
        WHERE messages.chat_id = chats.id
          AND messages.deleted_at IS NULL
        ORDER BY datetime(messages.created_at) DESC
        LIMIT 1
      )
    WHERE my_membership.user_id = ?
      AND my_membership.left_at IS NULL
    ORDER BY
      datetime(COALESCE(chats.last_message_at, chats.updated_at, chats.created_at)) DESC
    LIMIT 100`
  )
    .bind(user.id, user.id)
    .all();

  const chats = (rows.results || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_message_at: row.last_message_at,
    other_user: row.other_user_id
      ? {
          id: row.other_user_id,
          username: row.other_username,
          display_name: row.other_display_name,
          avatar_url: row.other_avatar_url,
          verified: Boolean(row.other_verified),
          created_at: row.other_created_at
        }
      : null,
    latest_message: row.latest_message_id
      ? {
          id: row.latest_message_id,
          sender_user_id: row.latest_sender_user_id,
          created_at: row.latest_message_created_at
        }
      : null
  }));

  return json({
    ok: true,
    chats
  });
}
