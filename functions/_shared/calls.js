
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

function cleanConfigValue(value, { token = false } = {}) {
  let result = String(value || "").trim();

  while (
    result.length >= 2 &&
    (
      (result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith("'") && result.endsWith("'")) ||
      (result.startsWith("`") && result.endsWith("`"))
    )
  ) {
    result = result.slice(1, -1).trim();
  }

  if (token) {
    result = result.replace(/^Bearer\s+/i, "");
  }

  return result.replace(/[\u0000-\u001F\u007F\s]+/g, "");
}

export function requireRealtimeConfig(env) {
  const accountId = cleanConfigValue(env.CLOUDFLARE_ACCOUNT_ID);
  const appId = cleanConfigValue(env.CLOUDFLARE_REALTIME_APP_ID);
  const token = cleanConfigValue(
    env.CLOUDFLARE_REALTIME_API_TOKEN,
    { token: true }
  );

  if (!accountId || !appId || !token) {
    throw new Error(
      "RealtimeKit variables are missing in this deployment."
    );
  }

  if (accountId.length > 32 || appId.length > 32) {
    throw new Error(
      "RealtimeKit Account ID or App ID is invalid. Copy only the raw ID."
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

  const rawText = await response.text();
  let data = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText };
  }

  if (!response.ok || data.success === false) {
    const apiMessage =
      data.errors?.map((item) => item?.message).filter(Boolean).join("; ") ||
      data.message ||
      data.error ||
      rawText ||
      "Unknown RealtimeKit error";

    if (response.status === 400 && /auth/i.test(apiMessage)) {
      throw new Error(
        "RealtimeKit authentication failed. Recreate the API Token with Account - Realtime - Realtime Admin, then replace CLOUDFLARE_REALTIME_API_TOKEN in the Production environment."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "RealtimeKit API Token does not have Realtime Admin permission."
      );
    }

    throw new Error(
      `RealtimeKit: ${apiMessage} (HTTP ${response.status})`
    );
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
