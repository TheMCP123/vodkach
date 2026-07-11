import { getCurrentUser, json } from "../../_shared/auth.js";
import { requireApprovedUser } from "../../_shared/account.js";

const USERNAME_REGEX = /^[A-Za-z0-9_.]{1,16}$/;
const DISPLAY_NAME_MAX_LENGTH = 16;

const BLOCKED_DISPLAY_NAME_REGEX =
  /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u;

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "");
}

function normalizeDisplayName(value) {
  return String(value || "").trim();
}

function getDisplayLength(value) {
  return Array.from(value).length;
}

function validateUsername(username) {
  if (username.length < 1) {
    return "Username must contain at least 1 character";
  }

  if (username.length > 16) {
    return "Username must be 16 characters or less";
  }

  if (!USERNAME_REGEX.test(username)) {
    return "Username can only contain A-Z, 0-9, underscore, and dot";
  }

  return null;
}

function validateDisplayName(displayName) {
  if (getDisplayLength(displayName) < 1) {
    return "Display Name must contain at least 1 character";
  }

  if (getDisplayLength(displayName) > DISPLAY_NAME_MAX_LENGTH) {
    return "Display Name must be 16 characters or less";
  }

  if (BLOCKED_DISPLAY_NAME_REGEX.test(displayName)) {
    return "Display Name contains unsupported control characters";
  }

  return null;
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  return json({
    ok: true,
    username: user.username,
    display_name: user.display_name
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const username = normalizeUsername(body.username);
  const displayName = normalizeDisplayName(body.display_name ?? body.displayName);

  const usernameError = validateUsername(username);
  if (usernameError) {
    return json({ ok: false, field: "username", error: usernameError }, { status: 400 });
  }

  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) {
    return json({ ok: false, field: "display_name", error: displayNameError }, { status: 400 });
  }

  const taken = await env.DB.prepare(
    "SELECT id FROM users WHERE lower(username) = lower(?) AND id != ? LIMIT 1"
  )
    .bind(username, user.id)
    .first();

  if (taken) {
    return json(
      {
        ok: false,
        field: "username",
        error: "Username is already taken"
      },
      { status: 409 }
    );
  }

  await env.DB.prepare(
    "UPDATE users SET username = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(username, displayName, user.id)
    .run();

  return json({
    ok: true,
    username,
    display_name: displayName
  });
}
