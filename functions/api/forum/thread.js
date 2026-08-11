import { getCurrentUser, json } from "../../_shared/auth.js";
import { requireApprovedUser } from "../../_shared/account.js";

function author(row) {
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

  const id = new URL(context.request.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "Missing thread id" }, { status: 400 });

  const row = await context.env.DB.prepare(
    `SELECT
      forum_threads.*,
      users.id AS author_user_id,
      users.username AS author_username,
      users.display_name AS author_display_name,
      users.avatar_url AS author_avatar_url,
      users.verified AS author_verified
     FROM forum_threads
     JOIN users ON users.id = forum_threads.author_user_id
     WHERE forum_threads.id = ?
     LIMIT 1`
  ).bind(id).first();

  if (!row) return json({ ok: false, error: "Thread not found" }, { status: 404 });

  const replies = await context.env.DB.prepare(
    `SELECT
      forum_replies.id,
      forum_replies.thread_id,
      forum_replies.body,
      forum_replies.created_at,
      forum_replies.updated_at,
      users.id AS author_user_id,
      users.username AS author_username,
      users.display_name AS author_display_name,
      users.avatar_url AS author_avatar_url,
      users.verified AS author_verified
     FROM forum_replies
     JOIN users ON users.id = forum_replies.author_user_id
     WHERE forum_replies.thread_id = ?
     ORDER BY forum_replies.created_at ASC`
  ).bind(id).all();

  return json({
    ok: true,
    thread: {
      id: row.id,
      title: row.title,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_activity_at: row.last_activity_at,
      is_pinned: Boolean(row.is_pinned),
      is_locked: Boolean(row.is_locked),
      author: author(row)
    },
    replies: (replies.results || []).map((item) => ({
      id: item.id,
      thread_id: item.thread_id,
      body: item.body,
      created_at: item.created_at,
      updated_at: item.updated_at,
      author: author(item)
    }))
  });
}
