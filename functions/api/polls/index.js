
import { getCurrentUser, json } from "../../_shared/auth.js";

function makeId(prefix) {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function isMember(env, chatId, userId) {
  const row = await env.DB.prepare(
    `SELECT 1 AS ok
     FROM chat_members
     WHERE chat_id = ?
       AND user_id = ?
       AND left_at IS NULL
     LIMIT 1`
  )
    .bind(chatId, userId)
    .first();

  return Boolean(row);
}

async function listPolls(env, chatId, userId) {
  await env.DB.prepare(
    `UPDATE chat_polls
     SET closed_at = datetime('now')
     WHERE chat_id = ?
       AND closed_at IS NULL
       AND closes_at IS NOT NULL
       AND datetime(closes_at) <= datetime('now')`
  )
    .bind(chatId)
    .run();

  const pollsResult = await env.DB.prepare(
    `SELECT
       chat_polls.*,
       users.username AS creator_username,
       users.display_name AS creator_display_name,
       EXISTS(
         SELECT 1 FROM chat_poll_votes
         WHERE chat_poll_votes.poll_id = chat_polls.id
           AND chat_poll_votes.user_id = ?
       ) AS current_user_voted
     FROM chat_polls
     JOIN users ON users.id = chat_polls.creator_user_id
     WHERE chat_polls.chat_id = ?
     ORDER BY datetime(chat_polls.created_at) DESC
     LIMIT 50`
  )
    .bind(userId, chatId)
    .all();

  const polls = [];

  for (const poll of pollsResult.results || []) {
    const optionsResult = await env.DB.prepare(
      `SELECT
         chat_poll_options.id,
         chat_poll_options.label,
         chat_poll_options.position,
         COUNT(chat_poll_votes.id) AS vote_count
       FROM chat_poll_options
       LEFT JOIN chat_poll_votes
         ON chat_poll_votes.option_id = chat_poll_options.id
       WHERE chat_poll_options.poll_id = ?
       GROUP BY chat_poll_options.id
       ORDER BY chat_poll_options.position ASC`
    )
      .bind(poll.id)
      .all();

    const ownVotesResult = await env.DB.prepare(
      `SELECT option_id
       FROM chat_poll_votes
       WHERE poll_id = ?
         AND user_id = ?`
    )
      .bind(poll.id, userId)
      .all();

    polls.push({
      ...poll,
      anonymous: Boolean(poll.anonymous),
      allow_multiple: Boolean(poll.allow_multiple),
      hide_results_until_vote: Boolean(poll.hide_results_until_vote),
      current_user_voted: Boolean(poll.current_user_voted),
      current_user_option_ids: (ownVotesResult.results || []).map(
        (row) => row.option_id
      ),
      options: optionsResult.results || []
    });
  }

  return polls;
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const chatId = String(url.searchParams.get("chat_id") || "").trim();

  if (!chatId || !(await isMember(context.env, chatId, user.id))) {
    return json({ ok: false, error: "Chat not found" }, { status: 404 });
  }

  return json({
    ok: true,
    polls: await listPolls(context.env, chatId, user.id)
  });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await readJson(context.request);
  const chatId = String(body?.chat_id || "").trim();
  const question = String(body?.question || "").trim();
  const rawOptions = Array.isArray(body?.options) ? body.options : [];
  const options = rawOptions
    .map((option) => String(option || "").trim())
    .filter(Boolean)
    .slice(0, 10);
  const duration = Math.max(
    0,
    Math.min(10080, Number(body?.duration_minutes || 0))
  );

  if (!(await isMember(context.env, chatId, user.id))) {
    return json({ ok: false, error: "Chat not found" }, { status: 404 });
  }

  if (!question || question.length > 300) {
    return json(
      { ok: false, error: "Question must contain 1 to 300 characters" },
      { status: 400 }
    );
  }

  if (options.length < 2 || options.some((option) => option.length > 100)) {
    return json(
      { ok: false, error: "Use 2 to 10 options, up to 100 characters each" },
      { status: 400 }
    );
  }

  const pollId = makeId("poll");
  const batch = [
    context.env.DB.prepare(
      `INSERT INTO chat_polls (
         id,
         chat_id,
         creator_user_id,
         question,
         anonymous,
         allow_multiple,
         hide_results_until_vote,
         closes_at,
         created_at
       ) VALUES (
         ?, ?, ?, ?, ?, ?, ?,
         CASE WHEN ? > 0 THEN datetime('now', '+' || ? || ' minutes') ELSE NULL END,
         datetime('now')
       )`
    ).bind(
      pollId,
      chatId,
      user.id,
      question,
      body?.anonymous ? 1 : 0,
      body?.allow_multiple ? 1 : 0,
      body?.hide_results_until_vote ? 1 : 0,
      duration,
      duration
    )
  ];

  options.forEach((label, index) => {
    batch.push(
      context.env.DB.prepare(
        `INSERT INTO chat_poll_options (id, poll_id, label, position)
         VALUES (?, ?, ?, ?)`
      ).bind(makeId("option"), pollId, label, index)
    );
  });

  await context.env.DB.batch(batch);

  return json({
    ok: true,
    poll_id: pollId,
    polls: await listPolls(context.env, chatId, user.id)
  });
}
