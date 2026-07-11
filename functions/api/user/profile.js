import { getCurrentUser, json } from "../../_shared/auth.js";

const USERNAME_REGEX = /^[A-Za-z0-9_.]{1,16}$/;
const BLOCKED_DISPLAY_NAME_REGEX =
  /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u;

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function visibleLength(value) {
  return Array.from(value).length;
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await readJson(context.request);

  if (!body) {
    return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const username = String(body.username || "").trim().replace(/^@+/, "");
  const displayName = String(body.display_name || "").trim();
  const pronouns = String(body.pronouns || "").trim();
  const bio = String(body.bio || "").trim();
  const avatarUrl = body.avatar_url ? String(body.avatar_url).trim() : null;

  if (!USERNAME_REGEX.test(username)) {
    return json(
      { ok: false, error: "Username can only contain A-Z, 0-9, underscore, and dot" },
      { status: 400 }
    );
  }

  if (
    visibleLength(displayName) < 1 ||
    visibleLength(displayName) > 16 ||
    BLOCKED_DISPLAY_NAME_REGEX.test(displayName)
  ) {
    return json({ ok: false, error: "Display Name is invalid" }, { status: 400 });
  }

  if (
    visibleLength(pronouns) > 16 ||
    BLOCKED_DISPLAY_NAME_REGEX.test(pronouns)
  ) {
    return json(
      { ok: false, error: "Pronouns must be 16 characters or less" },
      { status: 400 }
    );
  }

  if (visibleLength(bio) > 190) {
    return json({ ok: false, error: "Bio must be 190 characters or less" }, { status: 400 });
  }

  if (avatarUrl && avatarUrl.length > 1000000) {
    return json({ ok: false, error: "Avatar is too large" }, { status: 400 });
  }

  const taken = await context.env.DB.prepare(
    `SELECT id
     FROM users
     WHERE lower(username) = lower(?)
       AND id != ?
     LIMIT 1`
  )
    .bind(username, user.id)
    .first();

  if (taken) {
    return json({ ok: false, error: "Username is already taken" }, { status: 409 });
  }

  await context.env.DB.prepare(
    `UPDATE users
     SET username = ?,
         display_name = ?,
         avatar_url = ?,
         pronouns = ?,
         bio = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      username,
      displayName,
      avatarUrl,
      pronouns || null,
      bio || null,
      user.id
    )
    .run();

  return json({
    ok: true,
    username,
    display_name: displayName,
    avatar_url: avatarUrl,
    pronouns,
    bio
  });
}
