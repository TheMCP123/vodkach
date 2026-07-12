import { getCurrentUser, json } from "../../_shared/auth.js";

function boolValue(value) {
  return value === true || value === 1 || value === "1";
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body = {};

  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const callId = String(body.call_id || "").trim();

  if (!callId) {
    return json({ ok: false, error: "call_id is required" }, { status: 400 });
  }

  const call = await context.env.DB.prepare(
    `SELECT id, caller_user_id, callee_user_id, status
     FROM calls
     WHERE id = ?
       AND (caller_user_id = ? OR callee_user_id = ?)
     LIMIT 1`
  )
    .bind(callId, user.id, user.id)
    .first();

  if (!call) {
    return json({ ok: false, error: "Call not found" }, { status: 404 });
  }

  if (!["ringing", "active"].includes(call.status)) {
    return json({ ok: true, ignored: true });
  }

  const caller = call.caller_user_id === user.id;
  const joinedColumn = caller ? "caller_joined_at" : "callee_joined_at";
  const mutedColumn = caller ? "caller_muted" : "callee_muted";
  const sharingColumn = caller ? "caller_sharing" : "callee_sharing";
  const speakingColumn = caller ? "caller_speaking" : "callee_speaking";

  const joined = body.joined === undefined ? null : boolValue(body.joined);
  const muted = body.muted === undefined ? null : boolValue(body.muted);
  const sharing = body.sharing === undefined ? null : boolValue(body.sharing);
  const speaking = body.speaking === undefined ? null : boolValue(body.speaking);

  const assignments = [];
  const values = [];

  if (joined !== null) {
    assignments.push(`${joinedColumn} = ${joined ? "datetime('now')" : "NULL"}`);
  }

  if (muted !== null) {
    assignments.push(`${mutedColumn} = ?`);
    values.push(muted ? 1 : 0);
  }

  if (sharing !== null) {
    assignments.push(`${sharingColumn} = ?`);
    values.push(sharing ? 1 : 0);
  }

  if (speaking !== null) {
    assignments.push(`${speakingColumn} = ?`);
    values.push(speaking ? 1 : 0);
  }

  if (!assignments.length) {
    return json({ ok: true });
  }

  assignments.push("media_updated_at = datetime('now')");

  await context.env.DB.prepare(
    `UPDATE calls
     SET ${assignments.join(", ")}
     WHERE id = ?`
  )
    .bind(...values, callId)
    .run();

  return json({ ok: true });
}
