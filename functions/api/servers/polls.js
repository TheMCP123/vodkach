import { getCurrentUser, json } from "../../_shared/auth.js";

function makeId(prefix) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${prefix}_${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

async function channelAccess(env, channelId, userId) {
  return env.DB.prepare(`
    SELECT sc.id, sc.server_id, sc.type
    FROM server_channels sc
    JOIN server_members sm ON sm.server_id = sc.server_id
    WHERE sc.id = ? AND sm.user_id = ?
    LIMIT 1
  `).bind(channelId, userId).first();
}

async function pollAccess(env, pollId, userId) {
  return env.DB.prepare(`
    SELECT p.*, sc.server_id
    FROM server_polls p
    JOIN server_channels sc ON sc.id = p.channel_id
    JOIN server_members sm ON sm.server_id = sc.server_id
    WHERE p.id = ? AND sm.user_id = ?
    LIMIT 1
  `).bind(pollId, userId).first();
}

async function hydratePolls(env, channelId, userId) {
  const pollRows = await env.DB.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url
    FROM server_polls p
    JOIN users u ON u.id = p.creator_user_id
    WHERE p.channel_id = ?
    ORDER BY datetime(p.created_at) ASC
  `).bind(channelId).all();

  const polls = [];
  for (const poll of pollRows.results || []) {
    const options = await env.DB.prepare(`
      SELECT o.id, o.option_text, o.position,
             COUNT(v.user_id) AS vote_count,
             MAX(CASE WHEN v.user_id = ? THEN 1 ELSE 0 END) AS selected
      FROM server_poll_options o
      LEFT JOIN server_poll_votes v ON v.option_id = o.id
      WHERE o.poll_id = ?
      GROUP BY o.id
      ORDER BY o.position ASC
    `).bind(userId, poll.id).all();
    polls.push({
      ...poll,
      anonymous: Boolean(poll.anonymous),
      allow_multiple: Boolean(poll.allow_multiple),
      hide_results_until_vote: Boolean(poll.hide_results_until_vote),
      creator: {
        id: poll.creator_user_id,
        username: poll.username,
        display_name: poll.display_name,
        avatar_url: poll.avatar_url
      },
      options: (options.results || []).map((option) => ({
        ...option,
        selected: Boolean(option.selected),
        vote_count: Number(option.vote_count || 0)
      }))
    });
  }
  return polls;
}

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const channelId = new URL(request.url).searchParams.get("channel_id") || "";
  const access = await channelAccess(env, channelId, user.id);
  if (!access || access.type !== "text") return json({ ok: false, error: "Channel not found" }, { status: 404 });
  return json({ ok: true, polls: await hydratePolls(env, channelId, user.id) });
}

export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const data = await request.json().catch(() => ({}));
  const channelId = String(data.channel_id || "");
  const access = await channelAccess(env, channelId, user.id);
  if (!access || access.type !== "text") return json({ ok: false, error: "Channel not found" }, { status: 404 });

  const question = String(data.question || "").trim().slice(0, 300);
  const options = Array.isArray(data.options)
    ? data.options.map((value) => String(value || "").trim().slice(0, 120)).filter(Boolean).slice(0, 10)
    : [];
  if (!question || options.length < 2) return json({ ok: false, error: "Add a question and at least two options" }, { status: 400 });

  const pollId = makeId("spoll");
  const createdAt = new Date().toISOString();
  const duration = Math.max(0, Math.min(10080, Number(data.duration_minutes || 0)));
  const closesAt = duration ? new Date(Date.now() + duration * 60000).toISOString() : null;

  const statements = [
    env.DB.prepare(`INSERT INTO server_polls(id, channel_id, creator_user_id, question, anonymous, allow_multiple, hide_results_until_vote, closes_at, created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .bind(pollId, channelId, user.id, question, data.anonymous ? 1 : 0, data.allow_multiple ? 1 : 0, data.hide_results_until_vote ? 1 : 0, closesAt, createdAt)
  ];
  options.forEach((option, index) => {
    statements.push(env.DB.prepare(`INSERT INTO server_poll_options(id, poll_id, option_text, position) VALUES(?,?,?,?)`)
      .bind(makeId("spopt"), pollId, option, index));
  });
  await env.DB.batch(statements);
  const polls = await hydratePolls(env, channelId, user.id);
  return json({ ok: true, poll: polls.find((poll) => poll.id === pollId) });
}

export async function onRequestPatch({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const data = await request.json().catch(() => ({}));
  const poll = await pollAccess(env, String(data.poll_id || ""), user.id);
  if (!poll) return json({ ok: false, error: "Poll not found" }, { status: 404 });
  if (poll.closed_at || (poll.closes_at && Date.parse(poll.closes_at) <= Date.now())) {
    return json({ ok: false, error: "Poll is closed" }, { status: 409 });
  }

  if (data.action === "close") {
    if (poll.creator_user_id !== user.id) return json({ ok: false, error: "Only the poll creator can close it" }, { status: 403 });
    await env.DB.prepare(`UPDATE server_polls SET closed_at = datetime('now') WHERE id = ?`).bind(poll.id).run();
  } else {
    const optionId = String(data.option_id || "");
    const option = await env.DB.prepare(`SELECT id FROM server_poll_options WHERE id = ? AND poll_id = ?`).bind(optionId, poll.id).first();
    if (!option) return json({ ok: false, error: "Option not found" }, { status: 404 });
    const existing = await env.DB.prepare(`SELECT 1 FROM server_poll_votes WHERE poll_id = ? AND option_id = ? AND user_id = ?`).bind(poll.id, optionId, user.id).first();
    if (existing) {
      await env.DB.prepare(`DELETE FROM server_poll_votes WHERE poll_id = ? AND option_id = ? AND user_id = ?`).bind(poll.id, optionId, user.id).run();
    } else {
      const statements = [];
      if (!poll.allow_multiple) statements.push(env.DB.prepare(`DELETE FROM server_poll_votes WHERE poll_id = ? AND user_id = ?`).bind(poll.id, user.id));
      statements.push(env.DB.prepare(`INSERT INTO server_poll_votes(poll_id, option_id, user_id, created_at) VALUES(?,?,?,datetime('now'))`).bind(poll.id, optionId, user.id));
      await env.DB.batch(statements);
    }
  }
  const polls = await hydratePolls(env, poll.channel_id, user.id);
  return json({ ok: true, poll: polls.find((item) => item.id === poll.id) });
}
