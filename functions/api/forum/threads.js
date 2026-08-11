import { getCurrentUser, json } from "../../_shared/auth.js";
import { makeId, readJson, requireApprovedUser } from "../../_shared/account.js";

function cleanText(value) {
  return String(value || "").replace(/\r\n?/g, "\n").trim();
}

function authorFromRow(row) {
  return {
    id: row.author_user_id,
    username: row.author_username,
    display_name: row.author_display_name,
    avatar_url: row.author_avatar_url,
    verified: Boolean(row.author_verified)
  };
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  const denied = requireApprovedUser(user);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const q = cleanText(url.searchParams.get("q"));
  const sort = url.searchParams.get("sort") === "new" ? "new" : "active";
  const orderBy = sort === "new"
    ? "forum_threads.created_at DESC"
    : "forum_threads.is_pinned DESC, forum_threads.last_activity_at DESC";

  const where = q ? "WHERE forum_threads.title LIKE ? ESCAPE '\\' OR forum_threads.body LIKE ? ESCAPE '\\'" : "";
  const escaped = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  let stmt = context.env.DB.prepare(
    `SELECT
      forum_threads.id,
      forum_threads.title,
      forum_threads.body,
      forum_threads.is_pinned,
      forum_threads.is_locked,
      forum_threads.created_at,
      forum_threads.last_activity_at,
      users.id AS author_user_id,
      users.username AS author_username,
      users.display_name AS author_display_name,
      users.avatar_url AS author_avatar_url,
      users.verified AS author_verified,
      COUNT(forum_replies.id) AS reply_count
     FROM forum_threads
     JOIN users ON users.id = forum_threads.author_user_id
     LEFT JOIN forum_replies ON forum_replies.thread_id = forum_threads.id
     ${where}
     GROUP BY forum_threads.id
     ORDER BY ${orderBy}
     LIMIT 100`
  );
  if (q) stmt = stmt.bind(escaped, escaped);
  const result = await stmt.all();

  return json({
    ok: true,
    threads: (result.results || []).map((row) => ({
      id: row.id,
      title: row.title,
      body_preview: String(row.body || "").replace(/\s+/g, " ").slice(0, 240),
      is_pinned: Boolean(row.is_pinned),
      is_locked: Boolean(row.is_locked),
      created_at: row.created_at,
      last_activity_at: row.last_activity_at,
      reply_count: Number(row.reply_count || 0),
      author: authorFromRow(row)
    }))
  });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  const denied = requireApprovedUser(user);
  if (denied) return denied;

  const body = await readJson(context.request);
  const title = cleanText(body?.title).replace(/\s+/g, " ");
  const postBody = cleanText(body?.body);

  if (title.length < 3 || title.length > 140) {
    return json({ ok: false, error: "Title must be 3-140 characters" }, { status: 400 });
  }
  if (postBody.length < 1 || postBody.length > 12000) {
    return json({ ok: false, error: "Post must be 1-12000 characters" }, { status: 400 });
  }

  const id = makeId("thread");
  await context.env.DB.prepare(
    `INSERT INTO forum_threads (id, author_user_id, title, body, last_activity_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).bind(id, user.id, title, postBody).run();

  return json({ ok: true, thread: { id, title, body: postBody } }, { status: 201 });
}
