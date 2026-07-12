
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

function cleanConfigValue(value, { token = false, id = false } = {}) {
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

  result = result.replace(/[\u0000-\u001F\u007F\s]+/g, "");

  if (id && /^https?:\/\//i.test(result)) {
    try {
      const url = new URL(result);
      const parts = url.pathname.split("/").filter(Boolean);
      result = parts[parts.length - 1] || result;
    } catch {
      // Keep original value so the API can return the real error.
    }
  }

  return result;
}

export function requireRealtimeConfig(env) {
  const accountId = cleanConfigValue(
    env.CLOUDFLARE_ACCOUNT_ID,
    { id: true }
  );
  const appId = cleanConfigValue(
    env.CLOUDFLARE_REALTIME_APP_ID,
    { id: true }
  );
  const token = cleanConfigValue(
    env.CLOUDFLARE_REALTIME_API_TOKEN,
    { token: true }
  );

  if (!accountId || !appId || !token) {
    throw new Error(
      "RealtimeKit variables are missing in this deployment."
    );
  }

  return { accountId, appId, token };
}

let cachedResolvedAppId = null;

function extractApiMessage(data, rawText = "") {
  const candidates = [
    ...(Array.isArray(data?.errors) ? data.errors : []),
    data?.error,
    data?.message
  ].filter(Boolean);

  const parts = [];

  for (const item of candidates) {
    if (typeof item === "string") {
      parts.push(item);
      continue;
    }

    if (item && typeof item === "object") {
      if (typeof item.message === "string") {
        parts.push(item.message);
      } else if (typeof item.detail === "string") {
        parts.push(item.detail);
      } else {
        try {
          parts.push(JSON.stringify(item));
        } catch {
          // Ignore unserializable API error values.
        }
      }
    }
  }

  return parts.filter(Boolean).join("; ") || rawText || "Unknown RealtimeKit error";
}

async function parseCloudflareResponse(response) {
  const rawText = await response.text();
  let data = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText };
  }

  return { response, data, rawText };
}

async function fetchRealtimeApps(accountId, token) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/apps?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const parsed = await parseCloudflareResponse(response);

  if (!response.ok || parsed.data.success === false) {
    throw new Error(
      `Could not resolve RealtimeKit App ID: ${extractApiMessage(
        parsed.data,
        parsed.rawText
      )} (HTTP ${response.status})`
    );
  }

  const apps =
    parsed.data.result ||
    parsed.data.data ||
    [];

  return Array.isArray(apps) ? apps : [];
}

async function resolveRealtimeAppId(accountId, configuredAppId, token) {
  if (cachedResolvedAppId) return cachedResolvedAppId;

  const apps = await fetchRealtimeApps(accountId, token);

  const exactId = apps.find((app) => app?.id === configuredAppId);
  if (exactId?.id) {
    cachedResolvedAppId = exactId.id;
    return cachedResolvedAppId;
  }

  const vodkachApp = apps.find(
    (app) => String(app?.name || "").trim().toLowerCase() === "vodkach"
  );

  if (vodkachApp?.id) {
    cachedResolvedAppId = vodkachApp.id;
    return cachedResolvedAppId;
  }

  if (apps.length === 1 && apps[0]?.id) {
    cachedResolvedAppId = apps[0].id;
    return cachedResolvedAppId;
  }

  const names = apps
    .map((app) => app?.name)
    .filter(Boolean)
    .join(", ");

  throw new Error(
    names
      ? `RealtimeKit App ID is incorrect. Available apps: ${names}`
      : "No RealtimeKit apps were found in this Cloudflare account."
  );
}

async function performRealtimeRequest(
  accountId,
  appId,
  token,
  path,
  options
) {
  return fetch(
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
}

export async function realtimeRequest(env, path, options = {}) {
  const {
    accountId,
    appId: configuredAppId,
    token
  } = requireRealtimeConfig(env);

  let appId = cachedResolvedAppId || configuredAppId;
  let response = await performRealtimeRequest(
    accountId,
    appId,
    token,
    path,
    options
  );

  if (response.status === 404) {
    appId = await resolveRealtimeAppId(
      accountId,
      configuredAppId,
      token
    );

    response = await performRealtimeRequest(
      accountId,
      appId,
      token,
      path,
      options
    );
  }

  const { data, rawText } = await parseCloudflareResponse(response);

  if (!response.ok || data.success === false) {
    const apiMessage = extractApiMessage(data, rawText);

    if (response.status === 400 && /auth/i.test(apiMessage)) {
      throw new Error(
        "RealtimeKit authentication failed. Check the Production API Token."
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
