import { getCurrentUser, json } from "../../_shared/auth.js";
import { isAdminUser } from "../../_shared/account.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  return json({
    ok: true,
    authenticated: Boolean(user),
    admin: Boolean(user && isAdminUser(user, context.env)),
    user: user || null
  });
}
