
import { getCurrentUser, json } from "../../_shared/auth.js";
import {
  errorResponse,
  extractParticipantToken,
  getDirectChat,
  makeId,
  readJson,
  realtimeRequest
} from "../../_shared/calls.js";

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

  const directChat = await getDirectChat(context.env, chatId, user.id);

  if (!directChat) {
    return json({ ok: false, error: "Direct chat not found" }, { status: 404 });
  }

  const existing = await context.env.DB.prepare(
    `SELECT id
     FROM calls
     WHERE chat_id = ?
       AND status IN ('ringing', 'active')
       AND datetime(created_at) >= datetime('now', '-2 hours')
     LIMIT 1`
  )
    .bind(chatId)
    .first();

  if (existing) {
    return json(
      { ok: false, error: "A call is already active in this chat" },
      { status: 409 }
    );
  }

  try {
    const meeting = await realtimeRequest(context.env, "/meetings", {
      method: "POST",
      body: JSON.stringify({
        title: `Vodkach call ${chatId}`
      })
    });

    const meetingId = meeting.id || meeting.meeting_id;

    if (!meetingId) {
      throw new Error("RealtimeKit did not return a meeting ID");
    }

    const participant = await realtimeRequest(
      context.env,
      `/meetings/${meetingId}/participants`,
      {
        method: "POST",
        body: JSON.stringify({
          name: user.display_name || user.username || "Vodkach User",
          ...(user.avatar_url &&
          /^https?:\/\//i.test(user.avatar_url)
            ? { picture: user.avatar_url }
            : {}),
          preset_name: "vodkach_voice",
          custom_participant_id: user.id
        })
      }
    );

    const authToken = extractParticipantToken(participant);

    if (!authToken) {
      throw new Error("RealtimeKit did not return a participant token");
    }

    const callId = makeId("call");

    await context.env.DB.prepare(
      `INSERT INTO calls (
         id,
         chat_id,
         caller_user_id,
         callee_user_id,
         realtime_meeting_id,
         status,
         created_at,
         expires_at
       ) VALUES (?, ?, ?, ?, ?, 'ringing', datetime('now'), datetime('now', '+60 seconds'))`
    )
      .bind(
        callId,
        chatId,
        user.id,
        directChat.other_user_id,
        meetingId
      )
      .run();

    return json({
      ok: true,
      auth_token: authToken,
      call: {
        id: callId,
        chat_id: chatId,
        status: "ringing",
        other_user_id: directChat.other_user_id,
        other_username: directChat.other_username,
        other_display_name: directChat.other_display_name,
        other_avatar_url: directChat.other_avatar_url
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
