import { getCurrentUser, json } from "../../../_shared/auth.js";
import { ensureDirectChat, readJson, requireApprovedUser, sortedPair } from "../../../_shared/account.js";

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  const approvalResponse = requireApprovedUser(user);
  if (approvalResponse) return approvalResponse;

  const body = await readJson(context.request);
  const requestId = String(body?.request_id || "").trim();
  const action = String(body?.action || "").trim().toLowerCase();

  if (!requestId || !["accept", "reject"].includes(action)) {
    return json(
      {
        ok: false,
        error: "request_id and action accept/reject are required"
      },
      { status: 400 }
    );
  }

  const request = await context.env.DB.prepare(
    `SELECT id, requester_id, addressee_id, status
     FROM friend_requests
     WHERE id = ?
       AND addressee_id = ?
     LIMIT 1`
  )
    .bind(requestId, user.id)
    .first();

  if (!request || request.status !== "pending") {
    return json(
      {
        ok: false,
        error: "Friend request not found"
      },
      { status: 404 }
    );
  }

  if (action === "reject") {
    await context.env.DB.prepare(
      `UPDATE friend_requests
       SET status = 'rejected',
           responded_at = datetime('now')
       WHERE id = ?`
    )
      .bind(requestId)
      .run();

    return json({
      ok: true,
      status: "rejected"
    });
  }

  const [userA, userB] = sortedPair(request.requester_id, request.addressee_id);
  const chat = await ensureDirectChat(context.env, request.addressee_id, request.requester_id);

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE friend_requests
       SET status = 'accepted',
           responded_at = datetime('now')
       WHERE id = ?`
    ).bind(requestId),

    context.env.DB.prepare(
      `INSERT OR IGNORE INTO friendships (user_a_id, user_b_id)
       VALUES (?, ?)`
    ).bind(userA, userB)
  ]);

  return json({
    ok: true,
    status: "accepted",
    chat_id: chat.id
  });
}
