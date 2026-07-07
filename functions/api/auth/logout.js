import {
  clearCookie,
  getCookie,
  getSessionCookieName,
  json,
  sha256Hex
} from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const sessionToken = getCookie(request, getSessionCookieName());

  if (sessionToken && env.DB) {
    const sessionHash = await sha256Hex(sessionToken);

    await env.DB.prepare(
      "UPDATE sessions SET revoked_at = datetime('now') WHERE refresh_token_hash = ?"
    )
      .bind(sessionHash)
      .run();
  }

  return json(
    {
      ok: true,
      logged_out: true
    },
    {
      headers: {
        "Set-Cookie": clearCookie(getSessionCookieName())
      }
    }
  );
}

export async function onRequestGet(context) {
  return onRequestPost(context);
}
