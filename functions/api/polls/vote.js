
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
  const pollId = String(body?.poll_id || "").trim();
  const optionId = String(body?.option_id || "").trim();

  const option = await context.env.DB.prepare(
    `SELECT
       chat_poll_options.id,
       chat_polls.chat_id,
       chat_polls.allow_multiple,
       chat_polls.closed_at,
       chat_polls.closes_at
     FROM chat_poll_options
     JOIN chat_polls ON chat_polls.id = chat_poll_options.poll_id
     JOIN chat_members
       ON chat_members.chat_id = chat_polls.chat_id
      AND chat_members.user_id = ?
      AND chat_members.left_at IS NULL
     WHERE chat_poll_options.id = ?
       AND chat_poll_options.poll_id = ?
     LIMIT 1`
  )
    .bind(user.id, optionId, pollId)
    .first();

  if (!option) {
    return json({ ok: false, error: "Poll option not found" }, { status: 404 });
  }

  if (
    option.closed_at ||
    (option.closes_at &&
      new Date(`${option.closes_at}Z`).getTime() <= Date.now())
  ) {
    return json({ ok: false, error: "This poll is closed" }, { status: 409 });
  }

  const existing = await context.env.DB.prepare(
    `SELECT id
     FROM chat_poll_votes
     WHERE poll_id = ?
       AND option_id = ?
       AND user_id = ?
     LIMIT 1`
  )
    .bind(pollId, optionId, user.id)
    .first();

  if (existing) {
    await context.env.DB.prepare(
      `DELETE FROM chat_poll_votes WHERE id = ?`
    )
      .bind(existing.id)
      .run();

    return json({ ok: true, selected: false });
  }

  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const voteId = `vote_${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;

  const statements = [];

  if (!option.allow_multiple) {
    statements.push(
      context.env.DB.prepare(
        `DELETE FROM chat_poll_votes
         WHERE poll_id = ?
           AND user_id = ?`
      ).bind(pollId, user.id)
    );
  }

  statements.push(
    context.env.DB.prepare(
      `INSERT INTO chat_poll_votes (
         id,
         poll_id,
         option_id,
         user_id,
         created_at
       ) VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(voteId, pollId, optionId, user.id)
  );

  await context.env.DB.batch(statements);

  return json({ ok: true, selected: true });
}
