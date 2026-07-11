export async function onRequestGet(context) {
  return Response.json(
    {
      ok: true,
      turnstile_site_key: context.env.TURNSTILE_SITE_KEY || ""
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
