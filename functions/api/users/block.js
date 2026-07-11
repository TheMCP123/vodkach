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
  const blockedUserId = String(body?.user_id || "").trim();

  if (!blockedUserId || blockedUserId === user.id) {
    return json({ ok: false, error: "Invalid user" }, { status: 400 });
  }

  const target = await context.env.DB.prepare(
    `SELECT id FROM users WHERE id = ? LIMIT 1`
  )
    .bind(blockedUserId)
    .first();

  if (!target) {
    return json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const userA = user.id < blockedUserId ? user.id : blockedUserId;
  const userB = user.id < blockedUserId ? blockedUserId : user.id;

  const directChats = await context.env.DB.prepare(
    `SELECT chat_id
     FROM direct_chats
     WHERE user_a_id = ?
       AND user_b_id = ?`
  )
    .bind(userA, userB)
    .all();

  const statements = [
    context.env.DB.prepare(
      `INSERT INTO blocked_users (blocker_id, blocked_user_id)
       VALUES (?, ?)
       ON CONFLICT(blocker_id, blocked_user_id)
       DO UPDATE SET created_at = datetime('now')`
    ).bind(user.id, blockedUserId),

    context.env.DB.prepare(
      `DELETE FROM friendships
       WHERE (user_a_id = ? AND user_b_id = ?)
          OR (user_a_id = ? AND user_b_id = ?)`
    ).bind(user.id, blockedUserId, blockedUserId, user.id),

    context.env.DB.prepare(
      `DELETE FROM friend_requests
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)`
    ).bind(user.id, blockedUserId, blockedUserId, user.id)
  ];

  for (const row of directChats.results || []) {
    statements.push(
      context.env.DB.prepare("DELETE FROM chats WHERE id = ?").bind(row.chat_id)
    );
  }

  await context.env.DB.batch(statements);

  return json({ ok: true });
}
