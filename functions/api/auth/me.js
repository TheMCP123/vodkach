import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({
      ok: true,
      authenticated: false,
      user: null
    });
  }

  return json({
    ok: true,
    authenticated: true,
    user
  });
}
