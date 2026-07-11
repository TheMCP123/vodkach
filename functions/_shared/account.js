import { json } from "./auth.js";

export function getAdminEmails(env) {
  return String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user, env) {
  if (!user?.email) return false;
  return getAdminEmails(env).includes(String(user.email).toLowerCase());
}

export function requireApprovedUser(user) {
  if (!user) {
    return json(
      {
        ok: false,
        error: "Not authenticated"
      },
      { status: 401 }
    );
  }

  if (user.access_status !== "approved") {
    return json(
      {
        ok: false,
        error: "Access is not approved yet",
        access_status: user.access_status || "pending"
      },
      { status: 403 }
    );
  }

  return null;
}

export function requireAdminUser(user, env) {
  if (!user) {
    return json(
      {
        ok: false,
        error: "Not authenticated"
      },
      { status: 401 }
    );
  }

  if (!isAdminUser(user, env)) {
    return json(
      {
        ok: false,
        error: "Admin access required"
      },
      { status: 403 }
    );
  }

  return null;
}

export function makeId(prefix) {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);

  let token = "";
  for (const byte of bytes) {
    token += byte.toString(16).padStart(2, "0");
  }

  return `${prefix}_${token}`;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function sortedPair(a, b) {
  return [String(a), String(b)].sort();
}

export async function areFriends(env, userId, otherUserId) {
  const [userA, userB] = sortedPair(userId, otherUserId);

  const row = await env.DB.prepare(
    `SELECT 1 AS ok
     FROM friendships
     WHERE user_a_id = ?
       AND user_b_id = ?
     LIMIT 1`
  )
    .bind(userA, userB)
    .first();

  return Boolean(row);
}

export async function ensureDirectChat(env, currentUserId, otherUserId) {
  const [userA, userB] = sortedPair(currentUserId, otherUserId);

  const existing = await env.DB.prepare(
    `SELECT chats.id
     FROM direct_chats
     JOIN chats ON chats.id = direct_chats.chat_id
     WHERE direct_chats.user_a_id = ?
       AND direct_chats.user_b_id = ?
     LIMIT 1`
  )
    .bind(userA, userB)
    .first();

  if (existing) {
    return {
      id: existing.id,
      created: false
    };
  }

  const chatId = makeId("chat");

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO chats (id, type, created_by)
       VALUES (?, 'direct', ?)`
    ).bind(chatId, currentUserId),

    env.DB.prepare(
      `INSERT INTO direct_chats (chat_id, user_a_id, user_b_id)
       VALUES (?, ?, ?)`
    ).bind(chatId, userA, userB),

    env.DB.prepare(
      `INSERT INTO chat_members (chat_id, user_id, role)
       VALUES (?, ?, 'member')`
    ).bind(chatId, currentUserId),

    env.DB.prepare(
      `INSERT INTO chat_members (chat_id, user_id, role)
       VALUES (?, ?, 'member')`
    ).bind(chatId, otherUserId)
  ]);

  return {
    id: chatId,
    created: true
  };
}
