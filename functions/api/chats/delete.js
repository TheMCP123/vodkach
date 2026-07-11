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
  const chatId = String(body?.chat_id || "").trim();

  if (!chatId) {
    return json({ ok: false, error: "chat_id is required" }, { status: 400 });
  }

  const member = await context.env.DB.prepare(
    `SELECT 1 AS ok
     FROM chat_members
     WHERE chat_id = ?
       AND user_id = ?
       AND left_at IS NULL
     LIMIT 1`
  )
    .bind(chatId, user.id)
    .first();

  if (!member) {
    return json({ ok: false, error: "Chat not found" }, { status: 404 });
  }

  await context.env.DB.prepare(
    `DELETE FROM chats WHERE id = ?`
  )
    .bind(chatId)
    .run();

  return json({ ok: true });
}
