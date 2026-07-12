
import { getCurrentUser, json } from "../../_shared/auth.js";

function mapCall(row, viewerId) {
  const viewerIsCaller = row.caller_user_id === viewerId;

  const localIsCaller = viewerIsCaller;
  const localJoinedAt = localIsCaller
    ? row.caller_joined_at
    : row.callee_joined_at;
  const remoteJoinedAt = localIsCaller
    ? row.callee_joined_at
    : row.caller_joined_at;

  return {
    id: row.id,
    chat_id: row.chat_id,
    status: row.status,
    created_at: row.created_at,
    accepted_at: row.accepted_at,
    ended_at: row.ended_at,
    caller_user_id: row.caller_user_id,
    caller_username: row.caller_username,
    caller_display_name: row.caller_display_name,
    caller_avatar_url: row.caller_avatar_url,
    other_user_id: viewerIsCaller ? row.callee_user_id : row.caller_user_id,
    other_username: viewerIsCaller
      ? row.callee_username
      : row.caller_username,
    other_display_name: viewerIsCaller
      ? row.callee_display_name
      : row.caller_display_name,
    other_avatar_url: viewerIsCaller
      ? row.callee_avatar_url
      : row.caller_avatar_url,
    media: {
      local_joined: Boolean(localJoinedAt),
      remote_joined: Boolean(remoteJoinedAt),
      local_muted: Boolean(
        localIsCaller ? row.caller_muted : row.callee_muted
      ),
      remote_muted: Boolean(
        localIsCaller ? row.callee_muted : row.caller_muted
      ),
      local_sharing: Boolean(
        localIsCaller ? row.caller_sharing : row.callee_sharing
      ),
      remote_sharing: Boolean(
        localIsCaller ? row.callee_sharing : row.caller_sharing
      ),
      local_speaking: Boolean(
        localIsCaller ? row.caller_speaking : row.callee_speaking
      ),
      remote_speaking: Boolean(
        localIsCaller ? row.callee_speaking : row.caller_speaking
      )
    }
  };
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  await context.env.DB.prepare(
    `UPDATE calls
     SET status = 'missed',
         ended_at = datetime('now')
     WHERE status = 'ringing'
       AND datetime(expires_at) <= datetime('now')`
  ).run();

  const url = new URL(context.request.url);
  const requestedCallId = String(
    url.searchParams.get("call_id") || ""
  ).trim();

  const result = await context.env.DB.prepare(
    `SELECT
       calls.*,
       caller.username AS caller_username,
       caller.display_name AS caller_display_name,
       caller.avatar_url AS caller_avatar_url,
       callee.username AS callee_username,
       callee.display_name AS callee_display_name,
       callee.avatar_url AS callee_avatar_url
     FROM calls
     JOIN users caller ON caller.id = calls.caller_user_id
     JOIN users callee ON callee.id = calls.callee_user_id
     WHERE (calls.caller_user_id = ? OR calls.callee_user_id = ?)
       AND datetime(calls.created_at) >= datetime('now', '-2 hours')
       AND (? = '' OR calls.id = ?)
     ORDER BY datetime(calls.created_at) DESC
     LIMIT 5`
  )
    .bind(user.id, user.id, requestedCallId, requestedCallId)
    .all();

  const rows = result.results || [];
  const incomingRow = rows.find(
    (row) => row.callee_user_id === user.id && row.status === "ringing"
  );
  const currentRow = rows.find((row) =>
    ["ringing", "active", "declined", "ended", "missed"].includes(row.status)
  );

  return json({
    ok: true,
    incoming: incomingRow ? mapCall(incomingRow, user.id) : null,
    current: currentRow ? mapCall(currentRow, user.id) : null
  });
}
