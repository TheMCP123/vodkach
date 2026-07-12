
import { json } from "./auth.js";

export function makeId(prefix) {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function requireRealtimeConfig(env) {
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const appId = String(env.CLOUDFLARE_REALTIME_APP_ID || "").trim();
  const token = String(env.CLOUDFLARE_REALTIME_API_TOKEN || "").trim();

  if (!accountId || !appId || !token) {
    throw new Error(
      "RealtimeKit is not configured. Check CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_REALTIME_APP_ID and CLOUDFLARE_REALTIME_API_TOKEN."
    );
  }

  return { accountId, appId, token };
}

export async function realtimeRequest(env, path, options = {}) {
  const { accountId, appId, token } = requireRealtimeConfig(env);
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message =
      data.errors?.[0]?.message ||
      data.error ||
      `RealtimeKit request failed (${response.status})`;
    throw new Error(message);
  }

  return data.result || data.data || data;
}

export async function getDirectChat(env, chatId, userId) {
  return env.DB.prepare(
    `SELECT
       chats.id,
       other.user_id AS other_user_id,
       users.username AS other_username,
       users.display_name AS other_display_name,
       users.avatar_url AS other_avatar_url
     FROM chats
     JOIN chat_members self_member
       ON self_member.chat_id = chats.id
      AND self_member.user_id = ?
      AND self_member.left_at IS NULL
     JOIN chat_members other
       ON other.chat_id = chats.id
      AND other.user_id != ?
      AND other.left_at IS NULL
     JOIN users ON users.id = other.user_id
     WHERE chats.id = ?
       AND chats.type = 'direct'
     LIMIT 1`
  )
    .bind(userId, userId, chatId)
    .first();
}

export function extractParticipantToken(result) {
  return (
    result?.token ||
    result?.authToken ||
    result?.auth_token ||
    result?.participant?.token ||
    null
  );
}

export function errorResponse(error, status = 500) {
  return json(
    {
      ok: false,
      error: error?.message || "Unexpected error"
    },
    { status }
  );
}
