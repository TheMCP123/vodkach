import { getCurrentUser, json } from "../../_shared/auth.js";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  return json({
    ok: true,
    username: user.username
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

  if (!USERNAME_REGEX.test(username)) {
    return json(
      {
        ok: false,
        error: "Username must be 3-20 characters: a-z, 0-9, underscore only"
      },
      { status: 400 }
    );
  }

  const taken = await env.DB.prepare(
    "SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1"
  )
    .bind(username, user.id)
    .first();

  if (taken) {
    return json({ ok: false, error: "Username is already taken" }, { status: 409 });
  }

  await env.DB.prepare(
    "UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(username, user.id)
    .run();

  return json({
    ok: true,
    username
  });
}
