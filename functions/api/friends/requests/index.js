import { getCurrentUser, json } from "../../../_shared/auth.js";
import { makeId, normalizeUsername, readJson, requireApprovedUser, sortedPair, areFriends, ensureDirectChat } from "../../../_shared/account.js";

async function findUser(env, body) {
  if (body?.user_id) {
    return await env.DB.prepare(
      `SELECT id, username, display_name, avatar_url, access_status
       FROM users
       WHERE id = ?
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
    `SELECT id, username, display_name, avatar_url, access_status
     FROM users
     WHERE lower(username) = ?
     LIMIT 1`
  )
    .bind(username)
    .first();
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  const approvalResponse = requireApprovedUser(user);
  if (approvalResponse) return approvalResponse;

  const incoming = await context.env.DB.prepare(
    `SELECT
      friend_requests.id,
      friend_requests.status,
      friend_requests.created_at,
      users.id AS user_id,
      users.username,
      users.display_name,
      users.avatar_url,
      users.verified,
      users.pronouns,
      users.bio,
      users.status_preference,
      users.last_seen_at,
      CASE
        WHEN users.status_preference = 'offline' THEN 'offline'
        WHEN users.last_seen_at IS NOT NULL
          AND datetime(users.last_seen_at) >= datetime('now', '-35 seconds')
          THEN users.status_preference
        ELSE 'offline'
      END AS effective_status
    FROM friend_requests
    JOIN users ON users.id = friend_requests.requester_id
    WHERE friend_requests.addressee_id = ?
      AND friend_requests.status = 'pending'
    ORDER BY datetime(friend_requests.created_at) DESC`
  )
    .bind(user.id)
    .all();

  const outgoing = await context.env.DB.prepare(
    `SELECT
      friend_requests.id,
      friend_requests.status,
      friend_requests.created_at,
      users.id AS user_id,
      users.username,
      users.display_name,
      users.avatar_url,
      users.verified,
      users.pronouns,
      users.bio,
      users.status_preference,
      users.last_seen_at,
      CASE
        WHEN users.status_preference = 'offline' THEN 'offline'
        WHEN users.last_seen_at IS NOT NULL
          AND datetime(users.last_seen_at) >= datetime('now', '-35 seconds')
          THEN users.status_preference
        ELSE 'offline'
      END AS effective_status
    FROM friend_requests
    JOIN users ON users.id = friend_requests.addressee_id
    WHERE friend_requests.requester_id = ?
      AND friend_requests.status = 'pending'
    ORDER BY datetime(friend_requests.created_at) DESC`
  )
    .bind(user.id)
    .all();

  return json({
    ok: true,
    incoming: incoming.results || [],
    outgoing: outgoing.results || []
  });
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

  const otherUser = await findUser(context.env, body);

  if (!otherUser) {
    return json(
      {
        ok: false,
        error: "User not found"
      },
      { status: 404 }
    );
  }

  if (otherUser.access_status !== "approved") {
    return json(
      {
        ok: false,
        error: "User is not approved"
      },
      { status: 400 }
    );
  }

  if (otherUser.id === user.id) {
    return json(
      {
        ok: false,
        error: "You cannot add yourself"
      },
      { status: 400 }
    );
  }

  if (await areFriends(context.env, user.id, otherUser.id)) {
    const chat = await ensureDirectChat(context.env, user.id, otherUser.id);

    return json({
      ok: true,
      already_friends: true,
      chat_id: chat.id
    });
  }

  const reverse = await context.env.DB.prepare(
    `SELECT id
     FROM friend_requests
     WHERE requester_id = ?
       AND addressee_id = ?
       AND status = 'pending'
     LIMIT 1`
  )
    .bind(otherUser.id, user.id)
    .first();

  if (reverse) {
    const [userA, userB] = sortedPair(user.id, otherUser.id);
    const chat = await ensureDirectChat(context.env, user.id, otherUser.id);

    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE friend_requests
         SET status = 'accepted',
             responded_at = datetime('now')
         WHERE id = ?`
      ).bind(reverse.id),

      context.env.DB.prepare(
        `INSERT OR IGNORE INTO friendships (user_a_id, user_b_id)
         VALUES (?, ?)`
      ).bind(userA, userB)
    ]);

    return json({
      ok: true,
      accepted_reverse_request: true,
      chat_id: chat.id
    });
  }

  const existing = await context.env.DB.prepare(
    `SELECT id, status
     FROM friend_requests
     WHERE requester_id = ?
       AND addressee_id = ?
     LIMIT 1`
  )
    .bind(user.id, otherUser.id)
    .first();

  if (existing?.status === "pending") {
    return json({
      ok: true,
      request_id: existing.id,
      already_pending: true
    });
  }

  const requestId = makeId("fr");

  await context.env.DB.prepare(
    `INSERT OR REPLACE INTO friend_requests (
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      responded_at
    )
    VALUES (?, ?, ?, 'pending', datetime('now'), NULL)`
  )
    .bind(requestId, user.id, otherUser.id)
    .run();

  return json({
    ok: true,
    request_id: requestId
  });
}
