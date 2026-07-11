import { getCurrentUser, json } from "../../../_shared/auth.js";
import {
  areFriends,
  ensureDirectChat,
  normalizeUsername,
  readJson,
  requireApprovedUser
} from "../../../_shared/account.js";

async function getOtherUser(env, body) {
  if (body?.user_id) {
    return await env.DB.prepare(
      `SELECT id, username, display_name, avatar_url
       FROM users
       WHERE id = ?
         AND access_status = 'approved'
       LIMIT 1`
    )
      .bind(String(body.user_id))
      .first();
  }

  const username = normalizeUsername(body?.username);

  if (!username) {
    return null;
  }

  return await env.DB.prepare(
    `SELECT id, username, display_name, avatar_url
     FROM users
     WHERE lower(username) = ?
       AND access_status = 'approved'
     LIMIT 1`
  )
    .bind(username)
    .first();
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  const approvalResponse = requireApprovedUser(user);
  if (approvalResponse) return approvalResponse;

  const body = await readJson(context.request);

  if (!body) {
    return json(
      {
        ok: false,
        error: "Invalid JSON"
      },
      { status: 400 }
    );
  }

  const otherUser = await getOtherUser(context.env, body);

  if (!otherUser) {
    return json(
      {
        ok: false,
        error: "User not found"
      },
      { status: 404 }
    );
  }

  if (otherUser.id === user.id) {
    return json(
      {
        ok: false,
        error: "You cannot create a direct chat with yourself"
      },
      { status: 400 }
    );
  }

  if (!(await areFriends(context.env, user.id, otherUser.id))) {
    return json(
      {
        ok: false,
        error: "You can only text friends"
      },
      { status: 403 }
    );
  }

  const chat = await ensureDirectChat(context.env, user.id, otherUser.id);

  return json({
    ok: true,
    chat: {
      id: chat.id,
      type: "direct",
      other_user: otherUser
    },
    created: chat.created
  });
}
