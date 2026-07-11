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
  const otherUserId = String(body?.user_id || "").trim();

  if (!otherUserId || otherUserId === user.id) {
    return json({ ok: false, error: "Invalid user" }, { status: 400 });
  }

  const userA = user.id < otherUserId ? user.id : otherUserId;
  const userB = user.id < otherUserId ? otherUserId : user.id;

  await context.env.DB.prepare(
    `DELETE FROM friendships
     WHERE user_a_id = ?
       AND user_b_id = ?`
  )
    .bind(userA, userB)
    .run();

  return json({ ok: true });
}
