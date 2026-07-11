import {
  createCookie,
  getStateCookieName,
  getVerifierCookieName,
  randomToken,
  redirect,
  requireEnv,
  sha256Base64Url
} from "../../../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  const clientId = requireEnv(env, "GOOGLE_CLIENT_ID");
  const requestUrl = new URL(request.url);
  const appUrl = requestUrl.origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const requestedReturnTo = requestUrl.searchParams.get("return_to");
  const returnTo =
    requestedReturnTo && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";

  const state = randomToken(32);
  const codeVerifier = randomToken(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("code_challenge", codeChallenge);
  googleUrl.searchParams.set("code_challenge_method", "S256");
  googleUrl.searchParams.set("prompt", "select_account");

  const headers = new Headers();
  headers.append("Set-Cookie", createCookie(getStateCookieName(), state, { maxAge: 600 }));
  headers.append("Set-Cookie", createCookie(getVerifierCookieName(), codeVerifier, { maxAge: 600 }));
  headers.append("Set-Cookie", createCookie("vodkach_return_to", returnTo, { maxAge: 600 }));
  headers.set("Location", googleUrl.toString());

  return new Response(null, {
    status: 302,
    headers
  });
}
