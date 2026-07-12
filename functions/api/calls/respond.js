
import { getCurrentUser, json } from "../../_shared/auth.js";
import {
  errorResponse,
  extractParticipantToken,
  readJson,
  realtimeRequest
} from "../../_shared/calls.js";

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await readJson(context.request);
  const callId = String(body?.call_id || "").trim();
  const action = String(body?.action || "").trim();

  if (!callId || !["accept", "decline"].includes(action)) {
    return json({ ok: false, error: "Invalid call response" }, { status: 400 });
  }

  const call = await context.env.DB.prepare(
    `SELECT
       calls.*,
       caller.username AS caller_username,
       caller.display_name AS caller_display_name,
       caller.avatar_url AS caller_avatar_url
     FROM calls
     JOIN users caller ON caller.id = calls.caller_user_id
     WHERE calls.id = ?
       AND calls.callee_user_id = ?
     LIMIT 1`
  )
    .bind(callId, user.id)
    .first();

  if (!call) {
    return json({ ok: false, error: "Call not found" }, { status: 404 });
  }

  if (call.status !== "ringing") {
    return json(
      { ok: false, error: "This call is no longer ringing" },
      { status: 409 }
    );
  }

  if (action === "decline") {
    await context.env.DB.prepare(
      `UPDATE calls
       SET status = 'declined',
           ended_at = datetime('now')
       WHERE id = ?`
    )
      .bind(callId)
      .run();

    return json({ ok: true, call: { id: callId, status: "declined" } });
  }

  try {
    const participant = await realtimeRequest(
      context.env,
      `/meetings/${call.realtime_meeting_id}/participants`,
      {
        method: "POST",
        body: JSON.stringify({
          name: user.display_name || user.username || "Vodkach User",
          picture: user.avatar_url || undefined,
          preset_name: "vodkach_call",
          custom_participant_id: user.id
        })
      }
    );

    const authToken = extractParticipantToken(participant);

    if (!authToken) {
      throw new Error("RealtimeKit did not return a participant token");
    }

    await context.env.DB.prepare(
      `UPDATE calls
       SET status = 'active',
           accepted_at = datetime('now')
       WHERE id = ?`
    )
      .bind(callId)
      .run();

    return json({
      ok: true,
      auth_token: authToken,
      call: {
        id: call.id,
        chat_id: call.chat_id,
        status: "active",
        other_user_id: call.caller_user_id,
        other_username: call.caller_username,
        other_display_name: call.caller_display_name,
        other_avatar_url: call.caller_avatar_url
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
