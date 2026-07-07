import {
  clearCookie,
  createCookie,
  getSessionCookieName,
  getStateCookieName,
  getVerifierCookieName,
  getCookie,
  json,
  randomToken,
  requireEnv,
  sha256Hex
} from "../../../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json({ ok: false, error: "D1 binding DB is not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return json({ ok: false, error }, { status: 400 });
  }

  const storedState = getCookie(request, getStateCookieName());
  const codeVerifier = getCookie(request, getVerifierCookieName());

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return json({ ok: false, error: "Invalid OAuth state" }, { status: 400 });
  }

  const appUrl = url.origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: requireEnv(env, "GOOGLE_CLIENT_ID"),
      client_secret: requireEnv(env, "GOOGLE_CLIENT_SECRET"),
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();
    return json(
      {
        ok: false,
        error: "Google token exchange failed",
        details
      },
      { status: 400 }
    );
  }

  const tokens = await tokenResponse.json();

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`
    }
  });

  if (!userInfoResponse.ok) {
    return json({ ok: false, error: "Google userinfo request failed" }, { status: 400 });
  }

  const profile = await userInfoResponse.json();

  if (!profile.sub || !profile.email) {
    return json({ ok: false, error: "Google profile is missing required fields" }, { status: 400 });
  }

  const existingUser = await env.DB.prepare(
    "SELECT id FROM users WHERE google_sub = ? OR email = ? LIMIT 1"
  )
    .bind(profile.sub, profile.email)
    .first();

  const userId = existingUser?.id || crypto.randomUUID();
  const displayName = profile.name || profile.email.split("@")[0] || "Vodkach User";
  const avatarUrl = profile.picture || null;
  const emailVerified = profile.email_verified ? 1 : 0;

  if (existingUser) {
    await env.DB.prepare(
      `UPDATE users
       SET google_sub = ?,
           email = ?,
           email_verified = ?,
           display_name = ?,
           avatar_url = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(profile.sub, profile.email, emailVerified, displayName, avatarUrl, userId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO users (
        id,
        google_sub,
        email,
        email_verified,
        display_name,
        avatar_url
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, profile.sub, profile.email, emailVerified, displayName, avatarUrl)
      .run();
  }

  const sessionToken = randomToken(48);
  const sessionHash = await sha256Hex(sessionToken);
  const sessionId = crypto.randomUUID();

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (
      id,
      user_id,
      refresh_token_hash,
      created_at,
      expires_at
    ) VALUES (?, ?, ?, datetime('now'), ?)`
  )
    .bind(sessionId, userId, sessionHash, expiresAt)
    .run();

  const headers = new Headers();
  headers.append("Set-Cookie", createCookie(getSessionCookieName(), sessionToken, { maxAge: 30 * 24 * 60 * 60 }));
  headers.append("Set-Cookie", clearCookie(getStateCookieName()));
  headers.append("Set-Cookie", clearCookie(getVerifierCookieName()));
  headers.set("Location", `${appUrl}/`);

  return new Response(null, {
    status: 302,
    headers
  });
}
