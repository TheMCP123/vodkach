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
  const pronouns = String(body?.pronouns || "").trim();
  const bio = String(body?.bio || "").trim();

  if (Array.from(pronouns).length > 40) {
    return json({ ok: false, error: "Pronouns must be 40 characters or less" }, { status: 400 });
  }

  if (Array.from(bio).length > 190) {
    return json({ ok: false, error: "Bio must be 190 characters or less" }, { status: 400 });
  }

  await context.env.DB.prepare(
    `UPDATE users
     SET pronouns = ?,
         bio = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(pronouns || null, bio || null, user.id)
    .run();

  return json({
    ok: true,
    pronouns,
    bio
  });
}
