import {
  clearCookie,
  getCookie,
  getSessionCookieName,
  sha256Hex
} from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const sessionToken = getCookie(request, getSessionCookieName());

  if (sessionToken && env.DB) {
    const sessionHash = await sha256Hex(sessionToken);

    await env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE refresh_token_hash = ?
         AND revoked_at IS NULL`
    )
      .bind(sessionHash)
      .run();
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/api/auth/google/start?return_to=%2Fadmin%3Fattempted%3D1",
      "Set-Cookie": clearCookie(getSessionCookieName())
    }
  });
}
