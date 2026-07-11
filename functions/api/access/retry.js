import {
  clearCookie,
  getSessionCookieName,
  getCurrentUser,
  sha256Hex
} from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (user?.access_status === "rejected") {
    await env.DB.prepare(
      `UPDATE users
       SET access_status = 'pending',
           requested_at = datetime('now'),
           rejected_at = NULL,
           updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(user.id)
      .run();
  }

  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)vodkach_session=([^;]+)/);

  if (match?.[1]) {
    const sessionToken = decodeURIComponent(match[1]);
    const sessionHash = await sha256Hex(sessionToken);

    await env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE refresh_token_hash = ?`
    )
      .bind(sessionHash)
      .run();
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/api/auth/google/start",
      "Set-Cookie": clearCookie(getSessionCookieName())
    }
  });
}
