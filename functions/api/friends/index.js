import { getCurrentUser, json } from "../../_shared/auth.js";
import { requireApprovedUser } from "../../_shared/account.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  const approvalResponse = requireApprovedUser(user);
  if (approvalResponse) return approvalResponse;

  const rows = await context.env.DB.prepare(
    `SELECT
      other_users.id,
      other_users.username,
      other_users.display_name,
      other_users.avatar_url,
      friendships.created_at AS friends_since
    FROM friendships
    JOIN users other_users
      ON other_users.id = CASE
        WHEN friendships.user_a_id = ? THEN friendships.user_b_id
        ELSE friendships.user_a_id
      END
    WHERE friendships.user_a_id = ?
       OR friendships.user_b_id = ?
    ORDER BY lower(COALESCE(other_users.display_name, other_users.username)) ASC`
  )
    .bind(user.id, user.id, user.id)
    .all();

  return json({
    ok: true,
    friends: rows.results || []
  });
}
